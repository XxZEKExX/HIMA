import {
  SprayCan, Boxes, Library, BriefcaseMedical, Wine, Sprout, Radar, Wheat,
  ClipboardCheck, Droplets, Camera, ClipboardList, Users, Shield, Eye,
  Package, FileCheck, LayoutGrid, type LucideIcon,
} from 'lucide-react'

const ICONOS: Record<string, LucideIcon> = {
  'spray-can': SprayCan,
  'boxes': Boxes,
  'library': Library,
  'briefcase-medical': BriefcaseMedical,
  'wine': Wine,
  'sprout': Sprout,
  'radar': Radar,
  'wheat': Wheat,
  'clipboard-check': ClipboardCheck,
  'droplets': Droplets,
  'camera': Camera,
  'clipboard-list': ClipboardList,
  'users': Users,
  'shield': Shield,
  'eye': Eye,
  'package': Package,
  'file-check': FileCheck,
  'layout-grid': LayoutGrid,
}

export function resolverIcono(nombre: string): LucideIcon {
  return ICONOS[nombre] ?? LayoutGrid
}
