// @ts-nocheck
import { jsxRenderer } from 'hono/jsx-renderer'
export const renderer: any = jsxRenderer(({ children }: any) => {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  )
})

