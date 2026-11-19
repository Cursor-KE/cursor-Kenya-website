export type MarketingNavLink = {
  href: string
  label: string
}

export const marketingNavLinks: MarketingNavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/recaps', label: 'Recaps' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/community-showcase', label: 'Showcase' },
  { href: '/guides/cloud-agents', label: 'Cloud Agents' },
  { href: '/about', label: 'About' },
]

export const marketingFooterLinks: MarketingNavLink[] = marketingNavLinks.filter(
  (link) => link.href !== '/'
)

const frameCardLink: MarketingNavLink = {
  href: '/getyourcard',
  label: 'Get your card',
}

export function withOptionalFrameLink (
  links: readonly MarketingNavLink[],
  showFrameLink: boolean
): MarketingNavLink[] {
  if (!showFrameLink) {
    return [...links]
  }

  const insertAfter = links.findIndex((link) => link.href === '/events')
  const insertAt = insertAfter === -1 ? 1 : insertAfter + 1
  return [
    ...links.slice(0, insertAt),
    frameCardLink,
    ...links.slice(insertAt),
  ]
}
