import Foundation
import WidgetKit

enum WidgetSync {
    static let appGroup = "group.com.minti.app"
    static let payloadKey = "minti_widget"

    private static let capacitorKey = "CapacitorStorage.minti_widget"

    static func flush() {
        guard let shared = UserDefaults(suiteName: appGroup) else { return }

        let payload = UserDefaults.standard.string(forKey: capacitorKey)
        if shared.string(forKey: payloadKey) == payload { return }

        if let payload = payload {
            shared.set(payload, forKey: payloadKey)
        } else {
            shared.removeObject(forKey: payloadKey)
        }

        WidgetCenter.shared.reloadAllTimelines()
    }
}
