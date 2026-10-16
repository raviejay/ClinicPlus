// Document designer: the layout format. A layout is plain JSON stored in the database and edited by
// clinic admins, so it is always passed through sanitizeLayout() before it is drawn or printed.
// All sizes are millimetres on the paper, except font sizes (pt).

export type DocKind = 'medcert' | 'prescription'

export const DOC_KINDS: Record<DocKind, { label: string; prefix: string; description: string; icon: string }> = {
  medcert:      { label: 'Medical Certificate', prefix: 'MC', icon: 'verified',   description: 'For employment, school, travel, insurance or legal purposes.' },
  prescription: { label: 'Prescription (Rx)',   prefix: 'RX', icon: 'medication', description: 'Medicines with dosage and instructions.' },
}

export type PaperSize = 'a4' | 'letter' | 'a5' | 'half_letter' | 'legal'

export const PAPER_SIZES: Record<PaperSize, { label: string; w: number; h: number }> = {
  a4:          { label: 'A4 (210 × 297 mm)',            w: 210,   h: 297 },
  letter:      { label: 'Letter (8.5 × 11 in)',         w: 215.9, h: 279.4 },
  a5:          { label: 'A5 (148 × 210 mm)',            w: 148,   h: 210 },
  half_letter: { label: 'Half letter (5.5 × 8.5 in)',   w: 139.7, h: 215.9 },
  legal:       { label: 'Legal (8.5 × 14 in)',          w: 215.9, h: 355.6 },
}

export const FONTS = {
  georgia: { label: 'Georgia',         css: "Georgia, 'Times New Roman', serif" },
  times:   { label: 'Times New Roman', css: "'Times New Roman', Times, serif" },
  arial:   { label: 'Arial',           css: 'Arial, Helvetica, sans-serif' },
  verdana: { label: 'Verdana',         css: 'Verdana, Geneva, sans-serif' },
  courier: { label: 'Courier New',     css: "'Courier New', Courier, monospace" },
} as const
export type FontKey = keyof typeof FONTS
export const FONT_KEYS = Object.keys(FONTS) as FontKey[]

export type Align = 'left' | 'center' | 'right' | 'justify'
export type VAlign = 'top' | 'middle' | 'bottom'
export type Dash = 'solid' | 'dashed' | 'dotted'
export type Fit = 'contain' | 'cover' | 'fill'

export interface Border {
  width: number
  color: string
  radius: number
  style: Dash
}

interface Base {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** Locked elements can't be moved or resized in the designer */
  locked?: boolean
  /** A label shown in the layers list */
  name?: string
}

export interface TextEl extends Base {
  type: 'text'
  /** Plain text. {placeholders} are replaced with the document's details when it is issued */
  content: string
  font: FontKey
  size: number
  bold: boolean
  italic: boolean
  underline: boolean
  align: Align
  valign: VAlign
  color: string
  lineHeight: number
  /** Background color, or undefined for none */
  fill?: string
  border?: Border
  padding: number
}

export type ImageSource = { kind: 'clinic_logo' } | { kind: 'url'; url: string }

export interface ImageEl extends Base {
  type: 'image'
  source: ImageSource
  fit: Fit
  opacity: number
  radius: number
}

export interface LineEl extends Base {
  type: 'line'
  thickness: number
  color: string
  dash: Dash
}

export interface BoxEl extends Base {
  type: 'box'
  fill?: string
  border?: Border
}

/** The list of medicines of a prescription, drawn as numbered rows */
export interface MedicinesEl extends Base {
  type: 'medicines'
  font: FontKey
  size: number
  color: string
  lineHeight: number
  showNumber: boolean
  showQty: boolean
  /** Draw a large ℞ before the list */
  showSymbol: boolean
}

export type DocElement = TextEl | ImageEl | LineEl | BoxEl | MedicinesEl
export type ElementType = DocElement['type']

export interface DocLayout {
  version: 1
  paper: { size: PaperSize; orientation: 'portrait' | 'landscape'; /** Safe printing margin shown as a guide */ margin: number }
  elements: DocElement[]
}

export interface Medicine {
  name: string
  sig: string
  qty: string
}

/** What a document is filled with: every {placeholder} value plus the medicines list */
export interface DocData {
  values: Record<string, string>
  medicines: Medicine[]
  /** The clinic logo as it was when the document was issued, so a reprint looks the same */
  logoUrl?: string | null
}

export function paperDimensions(paper: DocLayout['paper']): { w: number; h: number } {
  const base = PAPER_SIZES[paper.size]
  return paper.orientation === 'landscape' ? { w: base.h, h: base.w } : { w: base.w, h: base.h }
}

export const MAX_ELEMENTS = 100
