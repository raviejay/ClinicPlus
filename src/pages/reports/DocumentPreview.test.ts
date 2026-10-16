import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentPreview from './DocumentPreview.vue'
import { presetLayout } from '@/utils/documents/presets'

describe('document preview size', () => {
  const layout = presetLayout('medcert', 'classic')

  it('draws a small thumbnail no wider than the width it was given', () => {
    const w = mount(DocumentPreview, { props: { layout, data: { values: {}, medicines: [] }, maxWidth: 90 } })
    const page = w.find('div.overflow-hidden').element as HTMLElement
    expect(parseFloat(page.style.width)).toBeLessThanOrEqual(90)
  })
})
