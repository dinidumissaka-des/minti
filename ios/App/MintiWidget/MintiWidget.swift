import SwiftUI
import UIKit
import WidgetKit

private let appGroup = "group.com.minti.app"
private let payloadKey = "minti_widget"

struct Snapshot: Decodable {
    let spent: Double
    let budget: Double?
    let currency: String
    let month: String

    static let placeholder = Snapshot(spent: 0, budget: nil, currency: "USD", month: "")

    static func load() -> Snapshot {
        guard
            let shared = UserDefaults(suiteName: appGroup),
            let raw = shared.string(forKey: payloadKey),
            let data = raw.data(using: .utf8),
            let decoded = try? JSONDecoder().decode(Snapshot.self, from: data)
        else { return .placeholder }
        return decoded
    }

    var formattedSpent: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.maximumFractionDigits = spent >= 1000 ? 0 : 2
        return formatter.string(from: NSNumber(value: spent)) ?? "\(spent)"
    }

    var progress: Double? {
        guard let budget = budget, budget > 0 else { return nil }
        return min(spent / budget, 1)
    }

    var remainingLabel: String? {
        guard let budget = budget, budget > 0 else { return nil }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.maximumFractionDigits = 0
        let remaining = max(budget - spent, 0)
        guard let text = formatter.string(from: NSNumber(value: remaining)) else { return nil }
        return "\(text) left"
    }
}

struct Entry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: Date(), snapshot: .load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let entry = Entry(date: Date(), snapshot: .load())
        let refresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

private let accent = Color(red: 0.624, green: 0.910, blue: 0.439)

private extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { color }
        } else {
            background(color)
        }
    }
}

struct MintiWidgetView: View {
    var entry: Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.snapshot.month.isEmpty ? "This month" : entry.snapshot.month)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.secondary)

            Text(entry.snapshot.formattedSpent)
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Spacer(minLength: 0)

            if let progress = entry.snapshot.progress {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(.quaternary)
                        Capsule()
                            .fill(accent)
                            .frame(width: max(geo.size.width * progress, 4))
                    }
                }
                .frame(height: 6)

                if let remaining = entry.snapshot.remainingLabel {
                    Text(remaining)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetBackground(Color(.systemBackground))
    }
}

@main
struct MintiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MintiWidget", provider: Provider()) { entry in
            MintiWidgetView(entry: entry)
        }
        .configurationDisplayName("Spending")
        .description("Your month-to-date spending and budget.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
