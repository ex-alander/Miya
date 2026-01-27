# Component Library Notes

## Buttons
- Variants: `primary`, `secondary`, `ghost`, `danger`, `outline`
- Sizes: `sm`, `md`, `lg`
- Usage: `<Button variant="danger" size="sm">Delete</Button>`

## Inputs
- `Input` supports `label`, `dark`, `error`.

## Modals
- `Modal` with `isOpen`, `onClose`, optional `title`, sizes `sm|md|lg`.

## Toasts
- Wrap app with `ToastProvider`. Use `useToast().showToast("message", "success")`.

## Card Flip
- `CardFlip` renders `front` and `back` content with click-to-flip animation.

## Rich Text Editor
- `RichTextEditor` uses TipTap starter-kit. Props: `value`, `onChange`, `label`, `placeholder`.

## Grid
- `Grid` responsive auto-fit columns. Props: `minColumnWidth`, `gap`.
