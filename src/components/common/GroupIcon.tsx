import { Icon, type LucideProps } from 'lucide-react'
import { groupIconOf } from '../../utils/groupIcons'

/** Decorative: it always stands beside the group's or the report's name. */
export function GroupIcon({ code, ...props }: { code: number | null | undefined } & LucideProps) {
  return <Icon iconNode={groupIconOf(code)} aria-hidden {...props} />
}
