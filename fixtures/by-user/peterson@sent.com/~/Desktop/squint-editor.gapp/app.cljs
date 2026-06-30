(ns editor)

(def SAVE_TIMEOUT_MS 15000)

(def state (atom {:saving false :opening false :filename "Untitled.txt"}))

(def browse-state (atom {:parent-id nil :can-go-up false :dir-name "Desktop"
                         :selected-id nil :selected-name nil}))

(def $editor (.getElementById js/document "editor"))
(def $filename (.getElementById js/document "filename"))
(def $status (.getElementById js/document "statusbar"))
(def $save (.getElementById js/document "save-btn"))
(def $open (.getElementById js/document "open-btn"))
(def $picker (.getElementById js/document "file-picker"))
(def $file-list (.getElementById js/document "file-list"))
(def $picker-open (.getElementById js/document "picker-open-btn"))
(def $picker-cancel (.getElementById js/document "picker-cancel-btn"))
(def $picker-status (.getElementById js/document "picker-status"))
(def $picker-up (.getElementById js/document "picker-up-btn"))
(def $picker-dir-name (.getElementById js/document "picker-dir-name"))

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
  (set! (.-disabled $open) (:opening @state))
  (set! (.-textContent $filename) (:filename @state)))

(defn show-picker! []
  (set! (.-display (.-style $picker)) "flex")
  (set! (.-textContent $picker-status) ""))

(defn hide-picker! []
  (set! (.-display (.-style $picker)) "none"))

(defn update-picker-nav! []
  (let [bs @browse-state]
    (set! (.-disabled $picker-up) (not (:can-go-up bs)))
    (set! (.-textContent $picker-dir-name) (:dir-name bs))
    (set! (.-disabled $picker-open) (nil? (:selected-id bs)))))

(defn select-file! [id name]
  (swap! browse-state assoc :selected-id id :selected-name name)
  (.forEach (.querySelectorAll $file-list ".picker-item")
    (fn [el]
      (let [item-id (js/parseInt (.. el -dataset -fileId) 10)]
        (.toggle (.-classList el) "selected" (= item-id id)))))
  (set! (.-disabled $picker-open) false))

(defn navigate-to! [dir-id]
  (set! (.-innerHTML $file-list) "")
  (set! (.-textContent $picker-status) "Loading…")
  (swap! browse-state assoc :selected-id nil :selected-name nil)
  (set! (.-disabled $picker-open) true)
  (post! (if dir-id
           #js {:type "fs:browse" :directoryId dir-id}
           #js {:type "fs:browse"})))

(defn populate-picker! [result]
  (let [entries (.-entries result)
        parent-id (.-parent_id result)
        can-go-up (.-can_go_up result)
        dir-name (.-name result)]
    (swap! browse-state assoc
           :parent-id parent-id
           :can-go-up can-go-up
           :dir-name dir-name
           :selected-id nil
           :selected-name nil)
    (set! (.-innerHTML $file-list) "")
    (set! (.-textContent $picker-status) "")
    (update-picker-nav!)
    (if (zero? (.-length entries))
      (set! (.-textContent $picker-status) "Empty folder")
      (doseq [entry entries]
        (let [el (.createElement js/document "div")
              is-dir (= "directory" (.-type entry))
              id (.-id entry)
              name (.-name entry)]
          (set! (.-className el) "picker-item")
          (set! (.-textContent el) (str (if is-dir "📁 " "📄 ") name))
          (set! (.. el -dataset -fileId) id)
          (if is-dir
            (.addEventListener el "click" (fn [] (navigate-to! id)))
            (.addEventListener el "click" (fn [] (select-file! id name))))
          (.appendChild $file-list el))))))

(defn picker-open! []
  (let [bs @browse-state
        file-id (:selected-id bs)]
    (when file-id
      (set! (.-textContent $picker-status) "Opening…")
      (post! #js {:type "fs:read" :fileId file-id}))))

(defn open! []
  (when-not (:opening @state)
    (swap! state assoc :opening true)
    (render!)
    (set! (.-innerHTML $file-list) "")
    (set! (.-textContent $picker-status) "Loading…")
    (show-picker!)
    (post! #js {:type "fs:browse"})))

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
    "fs:browse:complete" (populate-picker! (.-result msg))
    "fs:browse:error" (do
                        (swap! state assoc :opening false)
                        (render!)
                        (hide-picker!)
                        (status! (or (.-message msg) "Browse failed") true))
    "fs:read:complete" (let [r (.-result msg)]
                         (swap! state assoc :opening false)
                         (hide-picker!)
                         (load! #js {:filename (.-name r) :content (.-content r)})
                         (status! (str "Opened " (.-name r)) false))
    "fs:read:error" (do
                      (set! (.-textContent $picker-status) (or (.-message msg) "Could not open file")))
    nil))

(defn on-kernel-message! [event]
  (let [msg (.-data event)]
    (when (and (object? msg) (.-type msg))
      (handle-msg msg))))

(.addEventListener $save "click" #(save!))
(.addEventListener $open "click" #(open!))
(.addEventListener $picker-open "click" #(picker-open!))
(.addEventListener $picker-up "click" (fn []
                                        (when (:can-go-up @browse-state)
                                          (navigate-to! (:parent-id @browse-state)))))
(.addEventListener $picker-cancel "click" (fn []
                                            (swap! state assoc :opening false)
                                            (render!)
                                            (hide-picker!)))
(.addEventListener js/window "message" on-kernel-message!)
(.addEventListener js/document "keydown"
  (fn [e]
    (when (and (or (.-metaKey e) (.-ctrlKey e)) (= "s" (.-key e)))
      (.preventDefault e)
      (save!))))
(post! #js {:type "ready"})
