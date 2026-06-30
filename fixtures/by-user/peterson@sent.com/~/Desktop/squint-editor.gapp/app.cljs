(ns editor)

(def SAVE_TIMEOUT_MS 15000)

(def state (atom {:saving false :filename "Untitled.txt"}))

(def $editor (.getElementById js/document "editor"))
(def $filename (.getElementById js/document "filename"))
(def $status (.getElementById js/document "statusbar"))
(def $save (.getElementById js/document "save-btn"))

(defn post! [msg]
  (.postMessage js/window.parent msg "*"))

(defn get-content []
  (.-value $editor))

(defn set-content! [text]
  (set! (.-value $editor) (or text "")))

(defn status! [text err?]
  (set! (.-textContent $status) text)
  (.toggle (.-classList $status) "error" (boolean err?)))

(defn render! []
  (set! (.-disabled $save) (:saving @state))
  (set! (.-textContent $filename) (:filename @state)))

(defn load! [msg]
  (set-content! (.-content msg))
  (swap! state assoc :saving false :filename (or (.-filename msg) "Untitled.txt"))
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
  (js/console.log "save! called, state:" (clj->js @state))
  (when-not (:saving @state)
    (let [chosen (.prompt js/window "Save to your desktop as:" (:filename @state))]
      (js/console.log "save! chosen:" chosen)
      (when-not (nil? chosen)
        (let [filename (.trim chosen)]
          (if (zero? (.-length filename))
            (status! "Save cancelled — filename is required" true)
            (do
              (swap! state assoc :saving true :filename filename)
              (render!)
              (status! "" false)
              (schedule-save-timeout!)
              (js/console.log "save! posting to kernel")
              (post! #js {:type "save"
                          :filename filename
                          :content (get-content)}))))))))

(defn handle-msg [msg]
  (case (.-type msg)
    "init" (load! msg)
    "init:fresh" (load! msg)
    "save:complete" (do
                      (clear-save-timeout!)
                      (swap! state assoc :saving false)
                      (when-let [name (.-filename msg)]
                        (swap! state assoc :filename name))
                      (render!)
                      (status! "Saved" false))
    "save:error" (do
                   (clear-save-timeout!)
                   (swap! state assoc :saving false)
                   (render!)
                   (status! (.-message msg) true))
    nil))

(defn on-kernel-message! [event]
  (let [msg (.-data event)]
    (when (and (object? msg) (.-type msg))
      (handle-msg msg))))

(.addEventListener $save "click" #(save!))
(.addEventListener js/window "message" on-kernel-message!)
(.addEventListener js/document "keydown"
  (fn [e]
    (when (and (or (.-metaKey e) (.-ctrlKey e)) (= "s" (.-key e)))
      (.preventDefault e)
      (save!))))
(post! #js {:type "ready"})
