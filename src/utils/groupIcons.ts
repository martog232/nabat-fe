import {
  Bridge,
  Building,
  BusFront,
  Car,
  Construction,
  Lightbulb,
  MapPin,
  PawPrint,
  Store,
  Trash,
  Trees,
  Volume2,
  type IconNode,
} from 'lucide'

/**
 * An icon per category group, by Call Sofia's group code. Presentation, so it lives here
 * rather than in the catalogue; a group added on the server shows the pin until it gets one.
 *
 * Icons rather than emoji: emoji are drawn by the operating system, so the same report looked
 * different on Windows, Android and iOS, could not take a colour, and was read out by screen
 * readers by its Unicode name.
 *
 * As icon *data*, from the plain `lucide` package, not as `lucide-react` components: the map's
 * markers are HTML strings that Leaflet builds outside React, and a component cannot be turned
 * into one during a render. One table serves both — `GroupIcon` draws the data with
 * lucide-react's generic `Icon`, the markers with {@link groupIconSvg}.
 */
const GROUP_ICONS: Record<number, IconNode> = {
  1000: Trash, // Чистота
  1006: Construction, // Пътища и шахти — there is no pothole; the barrier is what one gets
  1012: Trees, // Паркове, градини и площадки
  1018: Car, // Автомобили
  1021: BusFront, // Градски транспорт
  1027: Lightbulb, // Осветление и пътна сигнализация
  1032: PawPrint, // Животни
  1035: Store, // Търговска дейност
  1038: Building, // Сгради и строежи
  1042: Volume2, // Нарушаване на обществения ред и шум
  1046: Bridge, // Подлези и мостове
  1049: MapPin, // Други
}

export function groupIconOf(groupCode: number | null | undefined): IconNode {
  return (groupCode != null && GROUP_ICONS[groupCode]) || MapPin
}

const escape = (v: string | number) =>
  String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/**
 * The group's icon as SVG markup, with Lucide's own defaults: a 24-unit box, no fill, round
 * caps and joins. For the map's markers, which are HTML strings.
 */
export function groupIconSvg(groupCode: number | null | undefined, opts: { size: number; color: string; strokeWidth: number }): string {
  const children = groupIconOf(groupCode)
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}="${escape(v as string | number)}"`)
        .join(' ')
      return `<${tag} ${a}/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size}" height="${opts.size}" viewBox="0 0 24 24" fill="none" stroke="${escape(opts.color)}" stroke-width="${opts.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`
}
