import Link from 'next/link'

/**
 * The same three links on every back-office page.
 *
 * Small thing, but the alternative is typing a URL to get from the orders to
 * the codes, and a tool you have to navigate by address bar is one you stop
 * opening.
 */
export default function AdminNav({ here }: { here: 'home' | 'orders' | 'coupons' }) {
  const link = (to: string, key: 'home' | 'orders' | 'coupons', label: string) => (
    <Link
      href={to}
      className="text-[14px] no-underline px-3 py-1.5"
      style={{
        borderRadius: 999,
        border: `1px solid ${here === key ? 'var(--ink)' : 'var(--line)'}`,
        background: here === key ? 'var(--ink)' : 'transparent',
        color: here === key ? 'var(--surface)' : 'var(--ink)',
      }}
    >
      {label}
    </Link>
  )

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-8">
      {link('/admin', 'home', 'Back office')}
      {link('/admin/orders', 'orders', 'Orders')}
      {link('/admin/coupons', 'coupons', 'Coupons')}
    </div>
  )
}
