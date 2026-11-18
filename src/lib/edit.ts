// Editor labels: the only place data-edit attributes are written. Spread the result
// onto the element that shows the value:
//
//   <h1 class="ip__title" {...edit(entry.filePath, '/title', { label: 'Project title' })}>
//
// `file` is repo-relative (an entry's filePath). `pointer` is a JSON Pointer into the
// front matter ("/title", "/gallery/0/image"), or "body" for the Markdown body.
// The editor's contract: grove-editor/docs/making-a-site-editable.md; how this site
// uses it: docs/editor.md.
//
// Render labelled elements even when their value is empty, or there is nothing to
// click; hide empty ones with CSS, not with a template `if`.

export type EditType = 'text' | 'rich' | 'choice' | 'image' | 'video'

export interface EditOptions {
  /** Field type; text is the default. */
  type?: EditType
  /** A name for people, shown in the editor's Changes and History. */
  label?: string
  /** Shown in the editor while the value is empty. */
  placeholder?: string
  /** Choices for type "choice". */
  options?: readonly string[]
  /** The key may be missing because the template has a fallback; the first edit adds it. */
  optional?: boolean
  /** Longest value the editor accepts. */
  max?: number
  /** Allow line breaks in a text field. */
  multiline?: boolean
}

export function edit(file: string | undefined, pointer: string, o: EditOptions = {}): Record<string, string> {
  if (!file) throw new Error(`edit(): no file for ${pointer}; pass the entry's filePath`)
  if (pointer !== 'body' && !pointer.startsWith('/')) {
    throw new Error(`edit(): "${pointer}" is neither "body" nor a JSON Pointer starting with /`)
  }
  const attrs: Record<string, string> = { 'data-edit': `${file}#${pointer}` }
  if (o.type) attrs['data-edit-type'] = o.type
  if (o.label) attrs['data-edit-label'] = o.label
  if (o.placeholder) attrs['data-edit-placeholder'] = o.placeholder
  if (o.options) attrs['data-edit-options'] = o.options.join('|')
  if (o.max) attrs['data-edit-max'] = String(o.max)
  if (o.multiline) attrs['data-edit-multiline'] = ''
  if (o.optional) attrs['data-edit-optional'] = ''
  return attrs
}
