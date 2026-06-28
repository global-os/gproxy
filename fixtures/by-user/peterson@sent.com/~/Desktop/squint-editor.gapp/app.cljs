(ns editor)

;; Squint .gapp reference editor
;;
;; Sustainable practices:
;; - Yjs Y.Text holds canonical document bytes; the textarea mirrors it (observe + input).
;; - RxJS pipes kernel postMessage traffic; no raw addEventListener for app protocol.
;; - Kernel only: ready, init/init:fresh, save — never fetch /api from the iframe.
;; - Platform deps are vendored IIFE files (yjs.js, rxjs.js) declared in gapp.json.
(def SAVE_TIMEOUT_MS 15000)

(def state (atom {:saving false}))

(def doc (js/Y.Doc.))
(def ytext (.getText doc "content"))

(def $editor (.getElementById js/document "editor"))
(def $filename (.getElementById js/document "filename"))
(def $status (.getElementById js/document "statusbar"))
(def $save (.getElementById js/document "save-btn"))

(defn post! [msg]
  (.postMessage js/window.parent msg "*"))

(defn get-content []
  (.toString ytext))

(defn set-content! [text]
  (.transact doc
    (fn []
      (.delete ytext 0 (.length ytext))
      (.insert ytext 0 (or text "")))))

(defn flush-editor! []
  (let [text (.-value $editor)]
    (.transact doc
      (fn []
        (when (not= text (get-content))
          (.delete ytext 0 (.length ytext))
          (.insert ytext 0 text))))))

(defn sync-editor! []
  (let [text (get-content)]
    (when (not= text (.-value $editor))
      (set! (.-value $editor) text))))

(defn on-input! [_]
  (let [text (.-value $editor)]
    (.transact doc
      (fn []
        (when (not= text (get-content))
          (.delete ytext 0 (.length ytext))
          (.insert ytext 0 text))))))

(defn status! [text err?]
  (set! (.-textContent $status) text)
  (.toggle (.-classList $status) "error" (boolean err?)))

(defn render! []
  (set! (.-disabled $save) (:saving @state)))

(defn set-filename! [name]
  (set! (.-value $filename) (or name "Untitled.txt")))

(defn load! [msg]
  (set-content! (.-content msg))
  (sync-editor!)
  (set-filename! (.-filename msg))
  (swap! state assoc :saving false)
  (render!)
  (status! "" false))

(defn clear-save-timeout! []
  (when-let [id (:save-timeout @state)]
    (.clearTimeout js/window id)
    (swap! state dissoc :save-timeout)))

(defn schedule-save-timeout! []
  (clear-save-timeout!)
  (swap! state assoc :save-timeout
    (.setTimeout js/window
      (fn []
        (when (:saving @state)
          (swap! state assoc :saving false)
          (render!)
          (status! "Save timed out — try again" true)))
      SAVE_TIMEOUT_MS)))

(defn save! []
  (when-not (:saving @state)
    (let [name (.trim (.-value $filename))]
      (if (zero? (.-length name))
        (status! "Filename required" true)
        (do
          (flush-editor!)
          (swap! state assoc :saving true)
          (render!)
          (status! "" false)
          (schedule-save-timeout!)
          (post! #js {:type "save"
                      :filename name
                      :content (get-content)}))))))

(defn handle-msg [msg]
  (case (.-type msg)
    "init" (load! msg)
    "init:fresh" (load! msg)
    "save:complete" (do
                      (clear-save-timeout!)
                      (swap! state assoc :saving false)
                      (when-let [name (.-filename msg)]
                        (set-filename! name))
                      (render!)
                      (status! "Saved" false))
    "save:error" (do
                   (clear-save-timeout!)
                   (swap! state assoc :saving false)
                   (render!)
                   (status! (.-message msg) true))
    nil))

(def messages$
  (-> (js/rxjs.fromEvent js/window "message")
      (.pipe (js/rxjs.map #(.-data %)))
      (.pipe (js/rxjs.filter #(.-type %)))))

(.observe ytext sync-editor!)
(.addEventListener $editor "input" on-input!)
(.addEventListener $save "click" #(save!))
(.addEventListener js/document "keydown"
  (fn [e]
    (when (and (or (.-metaKey e) (.-ctrlKey e)) (= "s" (.-key e)))
      (.preventDefault e)
      (save!))))
(.subscribe messages$ handle-msg)
(post! #js {:type "ready"})