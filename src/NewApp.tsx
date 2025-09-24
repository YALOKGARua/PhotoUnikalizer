import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './components/Icons'
import ModernButton from './components/ModernButton'
import AnimatedStats from './components/AnimatedStats'
import EnhancedStats from './components/EnhancedStats'
import LoadingSpinner from './components/LoadingSpinner'
import FileDropzone from './components/FileDropzone'
import ImageGrid from './components/ImageGrid'
import AnimatedBackground from './components/AnimatedBackground'
import { useSpring, animated, useSpringValue, useTrail, config } from '@react-spring/web'
import { useAppStore } from './store'
import { toast } from 'sonner'
import Confetti from 'react-confetti'
import { useWindowSize, useDebounce, useLocalStorage } from 'react-use'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import autoAnimate from '@formkit/auto-animate'
import {
  FaImage,
  FaFolderOpen,
  FaTrash,
  FaPlay,
  FaStop,
  FaEye,
  FaInfoCircle,
  FaFolder,
  FaDownload,
  FaCog,
  FaMagic,
  FaCamera,
  FaMobile,
  FaVideo,
  FaTimes
} from 'react-icons/fa'

const cn = (...classes: (string | undefined | null | boolean)[]) => twMerge(clsx(...classes))

function toFileUrl(p: string) {
  let s = p.replace(/\\/g, '/')
  if (!s.startsWith('/')) s = '/' + s
  return encodeURI('file://' + s)
}

type ProfileKind = 'camera'|'phone'|'action'|'drone'|'scanner'

const GEAR_PRESETS: Record<ProfileKind, any> = {
  camera: {
    makes: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic'],
    modelsByMake: {
      Canon: ['EOS R5', 'EOS 5D Mark IV', 'EOS 90D', 'EOS R6 Mark II'],
      Nikon: ['Z7 II', 'D850', 'Z6', 'Z8'],
      Sony: ['Alpha A7 IV', 'Alpha A7R III', 'Alpha A6400', 'Alpha A1'],
      Fujifilm: ['X‑T5', 'X‑S10', 'X100V', 'GFX 50S'],
      Panasonic: ['Lumix S5 II', 'Lumix GH6', 'Lumix G9']
    },
    lensesByMake: {
      Canon: ['RF 24‑70mm f/2.8L', 'EF 50mm f/1.8 STM', 'RF 70‑200mm f/2.8L', 'RF 35mm f/1.8'],
      Nikon: ['Z 24‑70mm f/2.8', 'AF‑S 50mm f/1.8G', 'Z 70‑200mm f/2.8', 'Z 35mm f/1.8'],
      Sony: ['FE 24‑70mm f/2.8 GM', 'FE 50mm f/1.8', 'FE 85mm f/1.8', 'FE 35mm f/1.8'],
      Fujifilm: ['XF 23mm f/1.4', 'XF 18‑55mm f/2.8‑4', 'XF 56mm f/1.2', 'XF 35mm f/1.4'],
      Panasonic: ['LUMIX S 24‑105mm f/4', 'LEICA 12‑60mm f/2.8‑4', 'LUMIX G 25mm f/1.7']
    }
  },
  phone: {
    makes: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei'],
    modelsByMake: {
      Apple: ['iPhone 15 Pro', 'iPhone 14 Pro', 'iPhone 13'],
      Samsung: ['Galaxy S24', 'Galaxy S23', 'Galaxy Note 20'],
      Xiaomi: ['Mi 13', 'Mi 11', 'Redmi Note 12'],
      Google: ['Pixel 8 Pro', 'Pixel 7', 'Pixel 6a'],
      Huawei: ['P60 Pro', 'P50', 'Mate 40']
    },
    lenses: ['Wide 26mm f/1.9', 'UltraWide 13mm f/2.2', 'Tele 77mm f/2.8']
  },
  action: {
    makes: ['GoPro', 'Insta360', 'DJI'],
    modelsByMake: {
      GoPro: ['HERO 12 Black', 'HERO 11', 'HERO 10'],
      Insta360: ['X3', 'ONE R', 'GO 3'],
      DJI: ['Osmo Action 4', 'Osmo Action 3']
    },
    lenses: ['UltraWide', 'Wide']
  },
  drone: {
    makes: ['DJI', 'Autel', 'Parrot'],
    modelsByMake: {
      DJI: ['Mavic 3', 'Air 2S', 'Mini 3 Pro'],
      Autel: ['EVO Lite+', 'EVO II'],
      Parrot: ['Anafi']
    },
    lenses: ['24mm f/2.8', '22mm f/2.8']
  },
  scanner: {
    makes: ['Epson', 'Canon', 'Plustek'],
    modelsByMake: {
      Epson: ['Perfection V600', 'Perfection V850'],
      Canon: ['CanoScan 9000F', 'LiDE 400'],
      Plustek: ['OpticFilm 8200i', 'ePhoto Z300']
    },
    lenses: ['CCD', 'CIS']
  }
}

const ISO_PRESETS = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400]
const EXPOSURE_TIMES = ['1/8000', '1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/200', '1/160', '1/125', '1/80', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '5', '10']
const FNUMBERS = [1.2, 1.4, 1.8, 2, 2.2, 2.8, 3.5, 4, 5.6, 8, 11, 16, 22]
const FOCALS = [12, 14, 16, 18, 20, 24, 28, 30, 35, 40, 50, 55, 70, 85, 105, 135, 200]
const EXPOSURE_PROGRAMS = [
  { v: 1, label: 'Ручной' },
  { v: 2, label: 'Программа' },
  { v: 3, label: 'Приоритет диафрагмы' },
  { v: 4, label: 'Приоритет выдержки' },
  { v: 5, label: 'Творческий' },
  { v: 6, label: 'Действие' },
  { v: 7, label: 'Портрет' },
  { v: 8, label: 'Пейзаж' }
]
const METERING_MODES = [
  { v: 0, label: 'Не задано' },
  { v: 1, label: 'Средний' },
  { v: 2, label: 'Центровзвешенный' },
  { v: 3, label: 'Точечный' },
  { v: 4, label: 'Мульти‑точечный' },
  { v: 5, label: 'Матрица' },
  { v: 6, label: 'Частичный' },
  { v: 255, label: 'Другое' }
]
const FLASH_MODES = [
  { v: 0, label: 'Нет вспышки' },
  { v: 1, label: 'Сработала' },
  { v: 5, label: 'Сработала (без возврата)' },
  { v: 7, label: 'Сработала (возврат)' },
  { v: 9, label: 'Сработала (принудительно)' },
  { v: 16, label: 'Выключена' }
]
const WHITE_BALANCES = [
  { v: 0, label: 'Авто' },
  { v: 1, label: 'Ручной' }
]
const COLOR_SPACES = ['sRGB', 'AdobeRGB', 'Display P3', 'ProPhoto RGB']
const RATINGS = [0, 1, 2, 3, 4, 5]

const LOCATION_PRESETS = [
  { id: 'none', label: '— Без пресета —' },
  { id: 'kyiv', label: 'Киев, Украина', lat: 50.4501, lon: 30.5234, alt: 179, city: 'Kyiv', state: 'Kyiv', country: 'Ukraine' },
  { id: 'warsaw', label: 'Варшава, Польша', lat: 52.2297, lon: 21.0122, alt: 100, city: 'Warsaw', state: 'Mazovia', country: 'Poland' },
  { id: 'berlin', label: 'Берлин, Германия', lat: 52.52, lon: 13.405, alt: 34, city: 'Berlin', state: 'Berlin', country: 'Germany' },
  { id: 'london', label: 'Лондон, Великобритания', lat: 51.5074, lon: -0.1278, alt: 35, city: 'London', state: 'England', country: 'United Kingdom' }
]

export default function NewApp() {
  const { t } = useTranslation()
  const [active, setActive] = useState<'files'|'ready'>('files')
  const files = useAppStore(s=>s.files)
  const setFiles = useAppStore(s=>s.setFiles)
  const addFiles = useAppStore(s=>s.addFiles)
  const removeAt = useAppStore(s=>s.removeAt)
  
  const [outputDir, setOutputDir] = useLocalStorage('output-dir', '')
  const [format, setFormat] = useLocalStorage<'jpg'|'png'|'webp'|'avif'|'heic'>('format', 'jpg')
  const [quality, setQuality] = useLocalStorage('quality', 85)
  const [colorDrift, setColorDrift] = useState(2)
  const [resizeDrift, setResizeDrift] = useState(2)
  const [resizeMaxW, setResizeMaxW] = useState(0)
  const [removeGps, setRemoveGps] = useState(true)
  const [dateStrategy, setDateStrategy] = useState<'now'|'offset'>('now')
  const [showConfetti, setShowConfetti] = useState(false)
  const { width, height } = useWindowSize()
  const [dateOffsetMinutes, setDateOffsetMinutes] = useState(0)
  const [uniqueId, setUniqueId] = useState(true)
  const [removeAll, setRemoveAll] = useState(false)
  const [softwareTag, setSoftwareTag] = useState(true)
  const [fake, setFake] = useState(false)
  const [fakeProfile, setFakeProfile] = useState<ProfileKind>('camera')
  const [fakeMake, setFakeMake] = useState('')
  const [fakeModel, setFakeModel] = useState('')
  const [fakeLens, setFakeLens] = useState('')
  const [fakeSoftware, setFakeSoftware] = useState('')
  const [fakeSerial, setFakeSerial] = useState('')
  const [fakeGps, setFakeGps] = useState(false)
  const [fakeLat, setFakeLat] = useState('')
  const [fakeLon, setFakeLon] = useState('')
  const [fakeAltitude, setFakeAltitude] = useState('')
  const [fakeAuto, setFakeAuto] = useState(true)
  const [fakePerFile, setFakePerFile] = useState(true)
  const [onlineAuto, setOnlineAuto] = useState(true)
  const [fakeIso, setFakeIso] = useState<number|''>('')
  const [fakeExposureTime, setFakeExposureTime] = useState('')
  const [fakeFNumber, setFakeFNumber] = useState<number|''>('')
  const [fakeFocalLength, setFakeFocalLength] = useState<number|''>('')
  const [fakeExposureProgram, setFakeExposureProgram] = useState<number|''>('')
  const [fakeMeteringMode, setFakeMeteringMode] = useState<number|''>('')
  const [fakeFlash, setFakeFlash] = useState<number|''>('')
  const [fakeWhiteBalance, setFakeWhiteBalance] = useState<number|''>('')
  const [fakeColorSpace, setFakeColorSpace] = useState('')
  const [fakeRating, setFakeRating] = useState<number|''>('')
  const [fakeLabel, setFakeLabel] = useState('')
  const [fakeTitle, setFakeTitle] = useState('')
  const [fakeCity, setFakeCity] = useState('')
  const [fakeState, setFakeState] = useState('')
  const [fakeCountry, setFakeCountry] = useState('')
  const [locationPreset, setLocationPreset] = useState('none')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState('')
  const [copyright, setCopyright] = useState('')
  const [creatorTool, setCreatorTool] = useState('')
  const [fakeTab, setFakeTab] = useState<'general'|'location'|'metadata'|'camera'>('general')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; lastFile: string; etaMs?: number; speedBps?: number; percent?: number }>({ current: 0, total: 0, lastFile: '' })
  const [results, setResults] = useState<{ src: string; out: string }[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState('')
  const [metaOpen, setMetaOpen] = useState(false)
  const [metaPayload, setMetaPayload] = useState<any>(null)
  const [statsData, setStatsData] = useState<any[]>([])
  const startTimeRef = useRef<number>(Date.now())
  const settingsRef = useRef<HTMLDivElement>(null)
  const filesGridRef = useRef<HTMLDivElement>(null)
  const resultsGridRef = useRef<HTMLDivElement>(null)
  
  const [debouncedQuality, setDebouncedQuality] = useState(quality)
  const [debouncedColorDrift, setDebouncedColorDrift] = useState(colorDrift)
  
  useDebounce(() => setDebouncedQuality(quality), 300, [quality])
  useDebounce(() => setDebouncedColorDrift(colorDrift), 300, [colorDrift])

  useEffect(() => {
    ;(async () => {
      try {
        const r = await window.api.ui.loadState()
        if (r && r.ok && r.data) {
          const d = r.data as any
          if (Array.isArray(d.files)) setFiles(d.files)
          if (typeof d.outputDir==='string') setOutputDir(d.outputDir)
          if (d.format) setFormat(d.format)
          if (typeof d.quality==='number') setQuality(d.quality)
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    try { window.api.ui.saveState({ files, outputDir, format, quality, active }) } catch {}
  }, [files, outputDir, format, quality, active])

  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    const mk = p.makes[0] || ''
    setFakeMake(mk)
    const md = (p.modelsByMake?.[mk] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[mk] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeProfile])

  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    const md = (p.modelsByMake?.[fakeMake] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[fakeMake] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeMake])

  useEffect(() => {
    const preset = LOCATION_PRESETS.find(x => x.id === locationPreset) as any
    if (!preset || preset.id === 'none') return
    setFakeLat(String(preset.lat))
    setFakeLon(String(preset.lon))
    setFakeAltitude(String(preset.alt))
    setFakeCity(preset.city || '')
    setFakeState(preset.state || '')
    setFakeCountry(preset.country || '')
  }, [locationPreset])

  useEffect(() => {
    const off = window.api.onProgress(d => {
      setProgress({ current: d.index + 1, total: d.total, lastFile: d.file, etaMs: Number(d.etaMs||0), speedBps: Number(d.speedBps||0), percent: Number(d.percent)||0 })
      if (d && d.status === 'ok' && d.outPath) {
        setResults(prev => [...prev, { src: d.file, out: d.outPath }])
        setStatsData(prev => [...prev, { name: `Файл ${d.index + 1}`, value: d.index + 1 }])
      }
    })
    const done = window.api.onComplete(() => { 
      setBusy(false); 
      setActive('ready');
      setShowConfetti(true);
      toast.success(`🎉 Обработка завершена! ${results.length} фото готово`, {
        duration: 4000,
        style: {
          background: '#059669',
          color: '#fff',
        },
      });
      setTimeout(() => setShowConfetti(false), 5000);
    })
    return () => { off(); done() }
  }, [])

  useEffect(() => {
    try {
      const off = window.api.onOsOpenFiles(async (list) => {
        if (Array.isArray(list) && list.length) {
          try { 
            const expanded = await window.api.expandPaths(list); 
            if (expanded && expanded.length) {
              addFiles(expanded);
              toast.success(`📁 Добавлено ${expanded.length} файлов`);
            }
          } catch {}
        }
      })
      return () => { try { off && off() } catch {} }
    } catch {}
  }, [])

  useEffect(() => {
    if (settingsRef.current) autoAnimate(settingsRef.current)
    if (filesGridRef.current) autoAnimate(filesGridRef.current)
    if (resultsGridRef.current) autoAnimate(resultsGridRef.current)
  }, [])

  const canStart = useMemo(() => files.length > 0 && outputDir && !busy, [files, outputDir, busy])

  const selectImages = async () => {
    const paths = await window.api.selectImages()
    if (!paths || !paths.length) return
    
    addFiles(paths)
    
    toast.success(`🖼️ Добавлено ${paths.length} изображений`, {
      duration: 3000,
      style: {
        background: 'var(--bg-success)',
        color: 'var(--text-success)',
      }
    })
  }

  const selectFolder = async () => {
    const paths = await window.api.selectImageDir()
    if (!paths || !paths.length) return
    
    addFiles(paths)
    
    toast.success(`📂 Добавлено ${paths.length} изображений из папки`, {
      duration: 3000,
      style: {
        background: 'var(--bg-success)',
        color: 'var(--text-success)',
      }
    })
  }

  const selectOutput = async () => {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  const clearFiles = () => {
    setFiles([])
    setProgress({ current: 0, total: 0, lastFile: '' })
    setResults([])
    setSelected(new Set())
  }

  const start = async () => {
    if (!canStart) return
    setBusy(true)
    startTimeRef.current = Date.now()
    setProgress({ current: 0, total: files.length, lastFile: '', etaMs: 0, speedBps: 0, percent: 0 })
    setResults([])
    setStatsData([])
    const toNum = (v: number|''|string) => { const n = typeof v === 'string' ? parseFloat(v) : v; return Number.isFinite(n as number) ? Number(n) : undefined }
    const payload: any = {
      inputFiles: files,
      outputDir,
      format,
      quality: Number(quality),
      colorDrift: Number(colorDrift),
      resizeDrift: Number(resizeDrift),
      resizeMaxW: Number(resizeMaxW),
      naming: '{name}_{index}.{ext}',
      meta: {
        removeGps,
        dateStrategy,
        dateOffsetMinutes: Number(dateOffsetMinutes),
        uniqueId,
        removeAll,
        softwareTag,
        fake,
        author,
        description,
        keywords: keywords ? keywords.split(',').map(s=>s.trim()).filter(Boolean) : [],
        copyright,
        creatorTool,
        fakeProfile,
        fakeMake,
        fakeModel,
        fakeLens,
        fakeSoftware,
        fakeSerial,
        fakeGps,
        fakeLat: toNum(fakeLat),
        fakeLon: toNum(fakeLon),
        fakeAltitude: toNum(fakeAltitude),
        fakeAuto,
        fakePerFile,
        onlineAuto,
        fakeIso: toNum(fakeIso),
        fakeExposureTime,
        fakeFNumber: toNum(fakeFNumber),
        fakeFocalLength: toNum(fakeFocalLength),
        fakeExposureProgram: toNum(fakeExposureProgram),
        fakeMeteringMode: toNum(fakeMeteringMode),
        fakeFlash: toNum(fakeFlash),
        fakeWhiteBalance: toNum(fakeWhiteBalance),
        fakeColorSpace: fakeColorSpace || undefined,
        fakeRating: toNum(fakeRating),
        fakeLabel: fakeLabel || undefined,
        fakeTitle: fakeTitle || undefined,
        fakeCity: fakeCity || undefined,
        fakeState: fakeState || undefined,
        fakeCountry: fakeCountry || undefined
      }
    }
    await window.api.processImages(payload)
  }

  const cancel = async () => { if (!busy) return; await window.api.cancel() }

  const makeOptions = (GEAR_PRESETS[fakeProfile]?.makes || []) as string[]
  const modelOptions = ((GEAR_PRESETS[fakeProfile]?.modelsByMake?.[fakeMake]) || []) as string[]
  const lensOptions = ((GEAR_PRESETS[fakeProfile]?.lensesByMake?.[fakeMake]) || (GEAR_PRESETS[fakeProfile]?.lenses) || []) as string[]

  const handleApplyPreset = (preset?: string) => {
    const selectedPreset = preset || 'professional'
    
    switch (selectedPreset) {
      case 'professional':
        setFakeProfile('camera')
        setFakeMake('Canon')
        setFakeModel('EOS R5')
        setFakeLens('RF 24-70mm f/2.8L IS USM')
        setFakeIso(400)
        setFakeExposureTime('1/125')
        setFakeFNumber(2.8)
        setFakeFocalLength(50)
        setAuthor('Professional Photographer')
        setKeywords('professional, photography, portrait, studio')
        setCopyright('© 2024 Professional Studio')
        toast.success('📷 Применен профессиональный шаблон', {
          duration: 3000,
          style: { background: '#7c3aed', color: '#fff' },
          action: {
            label: 'Отменить',
            onClick: () => toast.dismiss()
          }
        })
        break
      case 'travel':
        setFakeProfile('camera')
        setFakeMake('Sony')
        setFakeModel('α7R IV')
        setFakeGps(true)
        setLocationPreset('kyiv')
        setFakeIso(200)
        setFakeExposureTime('1/500')
        setKeywords('travel, journey, adventure, explore')
        setDescription('Amazing travel photography')
        toast.success('✈️ Применен шаблон путешествий', {
          duration: 3000,
          style: { background: '#0891b2', color: '#fff' },
          action: { label: 'Отменить', onClick: () => toast.dismiss() }
        })
        break
      case 'nature':
        setFakeProfile('camera')
        setFakeMake('Nikon')
        setFakeModel('Z9')
        setFakeLens('NIKKOR Z 100-400mm f/4.5-5.6 VR S')
        setFakeIso(800)
        setFakeFocalLength(300)
        setKeywords('nature, wildlife, landscape, outdoor')
        setDescription('Nature and wildlife photography')
        toast.success('🌿 Применен природный шаблон', {
          duration: 3000,
          style: { background: '#059669', color: '#fff' },
          action: { label: 'Отменить', onClick: () => toast.dismiss() }
        })
        break
      case 'studio':
        setFakeProfile('camera')
        setFakeMake('Hasselblad')
        setFakeModel('X1D II 50C')
        setFakeIso(100)
        setFakeExposureTime('1/60')
        setFakeFNumber(8)
        setFakeFlash(1)
        setKeywords('studio, portrait, fashion, commercial')
        setCreatorTool('Capture One Pro')
        toast.success('💡 Применен студийный шаблон', {
          duration: 3000,
          style: { background: '#dc2626', color: '#fff' },
          action: { label: 'Отменить', onClick: () => toast.dismiss() }
        })
        break
      case 'street':
        setFakeProfile('camera')
        setFakeMake('Fujifilm')
        setFakeModel('X-T5')
        setFakeLens('XF23mmF2 R WR')
        setFakeIso(1600)
        setFakeExposureTime('1/250')
        setFakeFNumber(5.6)
        setFakeColorSpace('sRGB')
        setKeywords('street, urban, city, documentary')
        setDescription('Street photography')
        toast.success('🏙️ Применен уличный шаблон', {
          duration: 3000,
          style: { background: '#ea580c', color: '#fff' },
          action: { label: 'Отменить', onClick: () => toast.dismiss() }
        })
        break
    }
  }

  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка приложения..." />
      </div>
    }>
      <div className="h-full text-slate-100 relative">
        <AnimatedBackground />
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.1}
          />
        )}
        <div className="toaster-container" />
      
      <div className="h-full">
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur overflow-x-auto with-gutter">
          <div className="flex items-center gap-3 flex-wrap">
            <ModernButton onClick={selectImages} variant="primary" icon={<FaImage className="w-4 h-4" />} tilt>
              {t('buttons.addFiles')}
            </ModernButton>
            <ModernButton onClick={selectFolder} variant="success" icon={<FaFolderOpen className="w-4 h-4" />} tilt>
              {t('buttons.addFolder')}
            </ModernButton>
            <ModernButton onClick={clearFiles} variant="danger" icon={<FaTrash className="w-4 h-4" />}>
              {t('buttons.clear')}
            </ModernButton>
            <ModernButton onClick={selectOutput} variant="warning" icon={<FaFolder className="w-4 h-4" />}>
              {t('common.pickFolder')}
            </ModernButton>
            {!!outputDir && (
              <div className="text-xs opacity-80 truncate max-w-[320px] px-3 py-2 bg-slate-800/60 rounded-lg border border-white/10">
                📁 {outputDir.split(/[/\\]/).pop()}
              </div>
            )}
            {!busy && (
              <ModernButton onClick={start} variant="primary" icon={<FaPlay className="w-4 h-4" />} disabled={!canStart} loading={busy}>
                {t('buttons.start')}
              </ModernButton>
            )}
            {busy && (
              <ModernButton onClick={cancel} variant="secondary" icon={<FaStop className="w-4 h-4" />}>
                {t('buttons.cancel')}
              </ModernButton>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-6" ref={settingsRef}>
          <div className="glass-card rounded-xl p-4 transition-all duration-300">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Основные настройки
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 text-xs">
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Формат</span>
                <select value={format} onChange={e=>setFormat(e.target.value as any)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors">
                  <option value="jpg">JPG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WEBP</option>
                  <option value="avif">AVIF</option>
                  <option value="heic">HEIC</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Качество</span>
                <input type="number" min={1} max={100} value={quality} onChange={e=>setQuality(Number(e.target.value)||0)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Цветовой дрифт %</span>
                <input type="number" min={0} max={10} value={colorDrift} onChange={e=>setColorDrift(Number(e.target.value)||0)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Дрифт размера %</span>
                <input type="number" min={0} max={10} value={resizeDrift} onChange={e=>setResizeDrift(Number(e.target.value)||0)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors" />
              </label>
              <label className="flex flex-col gap-2">
                <span className="opacity-70 font-medium">Макс. ширина</span>
                <input type="number" min={0} value={resizeMaxW} onChange={e=>setResizeMaxW(Number(e.target.value)||0)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors" />
              </label>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              Метаданные
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 transition-all cursor-pointer group border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={removeGps} 
                    onChange={e=>setRemoveGps(e.target.checked)} 
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" 
                  />
                  <div className="flex-1">
                    <span className="text-sm text-white group-hover:text-blue-300 transition-colors">Удалить GPS данные</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Удаляет координаты и геолокацию</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 transition-all cursor-pointer group border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={uniqueId} 
                    onChange={e=>setUniqueId(e.target.checked)} 
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" 
                  />
                  <div className="flex-1">
                    <span className="text-sm text-white group-hover:text-blue-300 transition-colors">Уникальный ID</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Генерирует уникальный идентификатор</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${
                    fake ? 'bg-slate-700/20 opacity-50 cursor-not-allowed border-slate-700/30' : 'bg-gradient-to-r from-rose-900/30 to-red-900/30 hover:from-rose-900/40 hover:to-red-900/40 border-rose-500/20'
                  }`}>
                  <input 
                    type="checkbox" 
                    checked={removeAll} 
                    onChange={e => {
                      if (!fake) {
                        setRemoveAll(e.target.checked)
                        if (e.target.checked) {
                          setFake(false)
                        }
                      }
                    }} 
                    disabled={fake}
                    className="w-4 h-4 text-rose-600 bg-gray-700 border-gray-600 rounded focus:ring-rose-500 disabled:opacity-50" 
                  />
                  <div className="flex-1">
                    <span className={`text-sm font-medium transition-colors ${fake ? 'text-slate-600' : 'text-white group-hover:text-rose-300'}`}>
                      <FaTrash className="inline w-3 h-3 mr-1" />
                      Удалить все метаданные
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {fake ? '⚠️ Недоступно при фейковых метаданных' : 'Полная очистка EXIF, IPTC, XMP'}
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 transition-all cursor-pointer group border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={softwareTag} 
                    onChange={e=>setSoftwareTag(e.target.checked)} 
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" 
                  />
                  <div className="flex-1">
                    <span className="text-sm text-white group-hover:text-blue-300 transition-colors">Добавить тег Software</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Добавляет информацию о программе</p>
                  </div>
                </label>
              </div>
              <div className="space-y-3">
                <label className="flex flex-col gap-2">
                  <span className="opacity-70 font-medium">Дата</span>
                  <select value={dateStrategy} onChange={e=>setDateStrategy(e.target.value as any)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors">
                    <option value="now">Текущее время</option>
                    <option value="offset">Смещение</option>
                  </select>
                </label>
                {dateStrategy === 'offset' && (
                  <label className="flex flex-col gap-2">
                    <span className="opacity-70 font-medium">Смещение, мин</span>
                    <input type="number" value={dateOffsetMinutes} onChange={e=>setDateOffsetMinutes(Number(e.target.value)||0)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-white/20 transition-colors" />
                  </label>
                )}
                <div className="border-t border-white/10 my-3"></div>
                <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${
                    removeAll ? 'bg-slate-700/20 opacity-50 cursor-not-allowed border-slate-700/30' : 'bg-gradient-to-r from-purple-900/30 to-indigo-900/30 hover:from-purple-900/40 hover:to-indigo-900/40 border-purple-500/20'
                  }`}>
                  <input 
                    type="checkbox" 
                    checked={fake} 
                    onChange={e => {
                      if (!removeAll) {
                        setFake(e.target.checked)
                        if (e.target.checked) {
                          setRemoveAll(false)
                        }
                      }
                    }} 
                    disabled={removeAll}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 disabled:opacity-50" 
                  />
                  <div className="flex-1">
                    <span className={`text-sm font-medium transition-colors ${
                      removeAll ? 'text-slate-600' : 'text-white group-hover:text-purple-300'
                    }`}>
                      <FaMagic className="inline w-3 h-3 mr-1" />
                      Фейковые метаданные
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {removeAll ? '⚠️ Недоступно при удалении метаданных' : 'Генерирует реалистичные EXIF данные'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {fake && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setFakeTab('general')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'general' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:settings" className="w-4 h-4 inline mr-2" />
                  Основные
                </button>
                <button
                  onClick={() => setFakeTab('location')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'location' ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:map-pin" className="w-4 h-4 inline mr-2" />
                  Геолокация
                </button>
                <button
                  onClick={() => setFakeTab('metadata')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'metadata' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:file-info" className="w-4 h-4 inline mr-2" />
                  Метаданные
                </button>
                <button
                  onClick={() => setFakeTab('camera')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${fakeTab === 'camera' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icon name="tabler:camera" className="w-4 h-4 inline mr-2" />
                  Камера
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApplyPreset()}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  <Icon name="tabler:sparkles" className="w-4 h-4 inline mr-2" />
                  Применить шаблон
                </button>
                <select 
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm hover:border-purple-400/30 transition-colors"
                >
                  <option value="">Выбрать шаблон...</option>
                  <option value="professional">Профессиональная съемка</option>
                  <option value="travel">Путешествие</option>
                  <option value="nature">Природа</option>
                  <option value="studio">Студийная съемка</option>
                  <option value="street">Уличная фотография</option>
                </select>
              </div>
            </div>

            {fakeTab === 'general' && (
              <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  Настройки генерации
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-800/10 hover:bg-purple-800/20 transition-all cursor-pointer group border border-purple-500/10">
                    <input 
                      type="checkbox" 
                      checked={fakeAuto} 
                      onChange={e=>setFakeAuto(e.target.checked)} 
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-purple-200">Авто-генерация</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Автоматический подбор параметров</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-800/10 hover:bg-purple-800/20 transition-all cursor-pointer group border border-purple-500/10">
                    <input 
                      type="checkbox" 
                      checked={fakePerFile} 
                      onChange={e=>setFakePerFile(e.target.checked)} 
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-purple-200">Уникально на файл</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Разные параметры для каждого</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-800/10 hover:bg-purple-800/20 transition-all cursor-pointer group border border-purple-500/10">
                    <input 
                      type="checkbox" 
                      checked={onlineAuto} 
                      onChange={e=>setOnlineAuto(e.target.checked)} 
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-purple-200">Online дефолты</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Использовать онлайн базу</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {fakeTab === 'camera' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 backdrop-blur-sm rounded-xl p-4 border border-indigo-500/20">
                  <h4 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                    <FaCamera className="w-3 h-3" />
                    Устройство и камера
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Профиль</span>
                      <select 
                        value={fakeProfile} 
                        onChange={e=>setFakeProfile(e.target.value as ProfileKind)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                      >
                        <option value="camera">📷 Камера</option>
                        <option value="phone">📱 Телефон</option>
                        <option value="action">📹 Экшн</option>
                        <option value="drone">🚁 Дрон</option>
                        <option value="scanner">🖨️ Сканер</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Производитель</span>
                      <select 
                        value={fakeMake} 
                        onChange={e=>setFakeMake(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                      >
                        {makeOptions.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Модель</span>
                      <select 
                        value={fakeModel} 
                        onChange={e=>setFakeModel(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                      >
                        {modelOptions.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Объектив</span>
                      <select 
                        value={fakeLens} 
                        onChange={e=>setFakeLens(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                      >
                        {lensOptions.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Software</span>
                      <input 
                        value={fakeSoftware} 
                        onChange={e=>setFakeSoftware(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                        placeholder="Photoshop..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-indigo-800/10 hover:bg-indigo-800/20 transition-all border border-indigo-500/10">
                      <span className="text-xs font-medium text-indigo-300">Serial</span>
                      <input 
                        value={fakeSerial} 
                        onChange={e=>setFakeSerial(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-indigo-400/30 transition-colors text-sm"
                        placeholder="123456..."
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
                  <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    <FaCog className="w-3 h-3" />
                    Параметры съёмки
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">ISO</span>
                      <select 
                        value={String(fakeIso)} 
                        onChange={e=>setFakeIso(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {ISO_PRESETS.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Выдержка</span>
                      <select 
                        value={fakeExposureTime} 
                        onChange={e=>setFakeExposureTime(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {EXPOSURE_TIMES.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Диафрагма</span>
                      <select 
                        value={String(fakeFNumber)} 
                        onChange={e=>setFakeFNumber(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {FNUMBERS.map(x => <option key={x} value={x}>f/{x}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Фокус (мм)</span>
                      <select 
                        value={String(fakeFocalLength)} 
                        onChange={e=>setFakeFocalLength(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {FOCALS.map(x => <option key={x} value={x}>{x}мм</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Программа</span>
                      <select 
                        value={String(fakeExposureProgram)} 
                        onChange={e=>setFakeExposureProgram(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {EXPOSURE_PROGRAMS.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Замер</span>
                      <select 
                        value={String(fakeMeteringMode)} 
                        onChange={e=>setFakeMeteringMode(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {METERING_MODES.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Вспышка</span>
                      <select 
                        value={String(fakeFlash)} 
                        onChange={e=>setFakeFlash(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {FLASH_MODES.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Баланс белого</span>
                      <select 
                        value={String(fakeWhiteBalance)} 
                        onChange={e=>setFakeWhiteBalance(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {WHITE_BALANCES.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Цвет. пространство</span>
                      <select 
                        value={fakeColorSpace} 
                        onChange={e=>setFakeColorSpace(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Авто</option>
                        {COLOR_SPACES.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10">
                      <span className="text-xs font-medium text-blue-300">Рейтинг</span>
                      <select 
                        value={String(fakeRating)} 
                        onChange={e=>setFakeRating(e.target.value ? Number(e.target.value) : '')} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                      >
                        <option value="">Нет</option>
                        {RATINGS.map(x => <option key={x} value={x}>{x > 0 ? '⭐'.repeat(x) : 'Нет'}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10 md:col-span-2 xl:col-span-2">
                      <span className="text-xs font-medium text-blue-300">Заголовок</span>
                      <input 
                        value={fakeTitle} 
                        onChange={e=>setFakeTitle(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                        placeholder="Название изображения..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-blue-800/10 hover:bg-blue-800/20 transition-all border border-blue-500/10 md:col-span-2 xl:col-span-1">
                      <span className="text-xs font-medium text-blue-300">Метка</span>
                      <input 
                        value={fakeLabel} 
                        onChange={e=>setFakeLabel(e.target.value)} 
                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-blue-400/30 transition-colors text-sm"
                        placeholder="Категория..."
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {fakeTab === 'location' && (
              <div className="bg-gradient-to-br from-green-900/20 to-teal-900/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                <h4 className="text-sm font-semibold text-green-300 mb-4 flex items-center gap-2">
                  <Icon name="tabler:map-pin" className="w-5 h-5" />
                  Геолокация
                </h4>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all cursor-pointer border border-green-500/10">
                      <input type="checkbox" checked={fakeGps} onChange={e=>setFakeGps(e.target.checked)} className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500" />
                      <Icon name="tabler:gps" className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-200">Включить GPS</span>
                    </label>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all cursor-pointer border border-green-500/10">
                      <input type="checkbox" checked={!!locationPreset && locationPreset!=='none'} onChange={e=>{ if (!e.target.checked) setLocationPreset('none') }} className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500" />
                      <Icon name="tabler:location" className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-200">Использовать пресет</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map-2" className="w-4 h-4" />
                        Пресет локации
                      </span>
                      <select value={locationPreset} onChange={e=>setLocationPreset(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm">
                        {LOCATION_PRESETS.map(x => (
                          <option key={x.id} value={x.id}>{x.id==='none' ? t('location.none', { defaultValue: x.label }) : x.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map-north" className="w-4 h-4" />
                        Широта
                      </span>
                      <input value={fakeLat} onChange={e=>setFakeLat(e.target.value)} placeholder="50.45" className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map-east" className="w-4 h-4" />
                        Долгота
                      </span>
                      <input value={fakeLon} onChange={e=>setFakeLon(e.target.value)} placeholder="30.52" className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:mountain" className="w-4 h-4" />
                        Высота (м)
                      </span>
                      <input value={fakeAltitude} onChange={e=>setFakeAltitude(e.target.value)} placeholder="100" className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:building" className="w-4 h-4" />
                        {t('fake.city', { defaultValue: 'Город' })}
                      </span>
                      <input value={fakeCity} onChange={e=>setFakeCity(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:map" className="w-4 h-4" />
                        {t('fake.state', { defaultValue: 'Регион' })}
                      </span>
                      <input value={fakeState} onChange={e=>setFakeState(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                    <label className="flex flex-col gap-2 p-3 rounded-lg bg-green-800/10 hover:bg-green-800/20 transition-all border border-green-500/10">
                      <span className="text-xs font-medium text-green-300 flex items-center gap-2">
                        <Icon name="tabler:world" className="w-4 h-4" />
                        {t('fake.country', { defaultValue: 'Страна' })}
                      </span>
                      <input value={fakeCountry} onChange={e=>setFakeCountry(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-green-400/30 transition-colors text-sm" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {fakeTab === 'metadata' && (
              <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20">
                <h4 className="text-sm font-semibold text-orange-300 mb-4 flex items-center gap-2">
                  <Icon name="tabler:file-info" className="w-5 h-5" />
                  Метаданные
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:user" className="w-4 h-4" />
                      {t('meta.author', { defaultValue: 'Автор' })}
                    </span>
                    <input value={author} onChange={e=>setAuthor(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="Введите имя автора" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10 md:col-span-2">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:file-text" className="w-4 h-4" />
                      {t('meta.description', { defaultValue: 'Описание' })}
                    </span>
                    <input value={description} onChange={e=>setDescription(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="Описание изображения" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:tags" className="w-4 h-4" />
                      {t('meta.keywords', { defaultValue: 'Ключевые слова' })}
                    </span>
                    <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="слово1, слово2, слово3" className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:copyright" className="w-4 h-4" />
                      Копирайт
                    </span>
                    <input value={copyright} onChange={e=>setCopyright(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="© 2024 Ваша компания" />
                  </label>
                  <label className="flex flex-col gap-2 p-3 rounded-lg bg-orange-800/10 hover:bg-orange-800/20 transition-all border border-orange-500/10">
                    <span className="text-xs font-medium text-orange-300 flex items-center gap-2">
                      <Icon name="tabler:tool" className="w-4 h-4" />
                      Программа создания
                    </span>
                    <input value={creatorTool} onChange={e=>setCreatorTool(e.target.value)} className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 hover:border-orange-400/30 transition-colors text-sm" placeholder="Photoshop, GIMP..." />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {progress && progress.total > 0 && (
          <div className="px-4 py-4 border-b border-white/10 bg-black/20 backdrop-blur">
            <EnhancedStats
              totalFiles={progress.total}
              processedFiles={progress.current}
              timeElapsed={Math.floor((Date.now() - startTimeRef.current) / 1000)}
              averageSpeed={progress.current / Math.max(1, (Date.now() - startTimeRef.current) / 1000)}
              estimatedTimeRemaining={progress.etaMs ? Math.ceil(progress.etaMs / 1000) : undefined}
            />
          </div>
        )}

        <div className="grid grid-cols-12 gap-0">
          <aside className="col-span-2 xl:col-span-2 border-r border-white/10 bg-gradient-to-b from-slate-950/60 to-slate-900/60 backdrop-blur-sm">
            <nav className="p-3 space-y-2">
              <button
                onClick={() => setActive('files')}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 group ${
                  active === 'files'
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 shadow-lg'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  active === 'files' ? 'bg-blue-500/20' : 'bg-slate-800/50 group-hover:bg-slate-700/50'
                }`}>
                  <Icon name="tabler:folders" className={`w-5 h-5 transition-colors ${
                    active === 'files' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className={`font-medium transition-colors ${
                    active === 'files' ? 'text-blue-300' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {t('tabs.files')}
                  </div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400">
                    {files.length} файлов
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActive('ready')}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 group ${
                  active === 'ready'
                    ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 shadow-lg'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className={`p-2 rounded-lg transition-colors ${
                  active === 'ready' ? 'bg-green-500/20' : 'bg-slate-800/50 group-hover:bg-slate-700/50'
                }`}>
                  <Icon name="tabler:checks" className={`w-5 h-5 transition-colors ${
                    active === 'ready' ? 'text-green-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className={`font-medium transition-colors ${
                    active === 'ready' ? 'text-green-300' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {t('tabs.ready')}
                  </div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400">
                    {results.length} готово
                  </div>
                </div>
              </button>
            </nav>
          </aside>

          <section className="col-span-10 xl:col-span-10 p-4 with-gutter">
            {active==='files' && (
              <animated.div style={useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })} className="space-y-6">
                {files.length === 0 && (
                  <FileDropzone
                    onFilesAdded={async (paths) => {
                      const expanded = await window.api.expandPaths(paths)
                      if (expanded && expanded.length) {
                        addFiles(expanded)
                        toast.success(`📁 Добавлено ${expanded.length} файлов`, {
                          duration: 3000,
                          style: { background: 'var(--bg-success)', color: 'var(--text-success)' }
                        })
                      }
                    }}
                  />
                )}
                
                {files.length > 0 && (
                  <div ref={filesGridRef}>
                    <ImageGrid
                      items={files.map((path, index) => ({
                        id: `file-${index}`,
                        path,
                        selected: selected.has(index)
                      }))}
                    onItemsChange={(items) => {
                      const newPaths = items.map(item => item.path)
                      setFiles(newPaths)
                    }}
                    onPreview={(item) => {
                      setPreviewSrc(toFileUrl(item.path))
                      setPreviewOpen(true)
                    }}
                    onRemove={(item) => {
                      const index = files.indexOf(item.path)
                      if (index !== -1) {
                        removeAt(index)
                        toast.success('🗑️ Файл удален', {
                          duration: 2000,
                          style: { background: 'var(--bg-warning)', color: 'var(--text-warning)' }
                        })
                      }
                    }}
                    onSelectionChange={(selectedItems) => {
                      const indices = new Set(
                        selectedItems.map(item => {
                          const match = item.id.match(/file-(\d+)/)
                          return match ? parseInt(match[1]) : -1
                        }).filter(i => i !== -1)
                      )
                      setSelected(indices)
                    }}
                    sortable={true}
                  />
                  </div>
                )}
              </animated.div>
            )}

            {active==='ready' && (
              <animated.div style={useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })} className="space-y-4">
                {!!results.length && (
                  <div ref={resultsGridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 @container">
                    {results.map((r, i) => (
                      <div key={r.out+i} className="group bg-slate-900/60 rounded-md overflow-hidden border border-white/5 relative cursor-pointer">
                        <div className="h-36 bg-slate-900 flex items-center justify-center overflow-hidden relative">
                          <img loading="lazy" decoding="async" alt="result" className="max-h-36 transition-transform group-hover:scale-[1.1]" src={toFileUrl(r.out)} />
                          <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/60 flex items-center justify-center gap-2 pointer-events-none">
                            <button className="chip pointer-events-auto bg-blue-600/90 hover:bg-blue-500" onClick={(e)=>{ e.stopPropagation(); setPreviewSrc(toFileUrl(r.out)); setPreviewOpen(true) }}>
                              <FaEye className="w-3 h-3 mr-1" />
                              {t('common.preview')||'Preview'}
                            </button>
                            <button className="chip pointer-events-auto bg-purple-600/90 hover:bg-purple-500" onClick={async (e)=>{ e.stopPropagation(); try { const meta = await window.api.metaBeforeAfter(r.src, r.out); const a = await window.api.fileStats(r.out); const b = await window.api.fileStats(r.src); setMetaPayload({ meta, afterStats: a, beforeStats: b }); setMetaOpen(true) } catch {} }}>
                              <FaInfoCircle className="w-3 h-3 mr-1" />
                              Metadata
                            </button>
                            <button className="chip pointer-events-auto bg-green-600/90 hover:bg-green-500" onClick={(e)=>{ e.stopPropagation(); window.api.openPath(r.out) }}>
                              <FaFolder className="w-3 h-3 mr-1" />
                              {t('common.open')||'Open'}
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] p-2 truncate opacity-80 flex items-center gap-2" title={r.out}>
                          <span className="flex-1 truncate">{r.out}</span>
                          <button className="btn btn-violet text-[10px]" onClick={()=>window.api.openPath(r.out)}>
                            <FaFolder className="w-3 h-3 mr-1" />
                            {t('common.open')||'Open'}
                          </button>
                          <button className="btn btn-amber text-[10px]" onClick={()=>window.api.showInFolder(r.out)}>
                            <FaFolderOpen className="w-3 h-3 mr-1" />
                            {t('common.folder')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!results.length && <div className="opacity-60 text-xs">{t('ready.empty')}</div>}
              </animated.div>
            )}
          </section>
        </div>

        {previewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80" onClick={()=>setPreviewOpen(false)} />
            <div className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-slate-900">
              <img alt="preview" src={previewSrc} className="max-w-[90vw] max-h-[90vh]" />
              <button onClick={()=>setPreviewOpen(false)} className="btn btn-ghost absolute top-2 right-2 text-xs">
                Close
              </button>
            </div>
          </div>
        )}

        {metaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80" onClick={()=>setMetaOpen(false)} />
            <div className="relative w-[860px] max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-slate-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <FaInfoCircle className="w-4 h-4 text-purple-400" />
                  Metadata Before / After
                </div>
                <button onClick={()=>setMetaOpen(false)} className="btn btn-ghost text-xs">
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs overflow-auto max-h-[75vh]">
                <div>
                  <div className="font-semibold mb-1 text-red-400">Before</div>
                  <pre className="bg-slate-950/60 border border-white/10 rounded p-2 whitespace-pre-wrap break-words">{JSON.stringify({
                    ...(metaPayload?.meta?.before||{}),
                    sizeBytes: metaPayload?.beforeStats?.stats?.sizeBytes || 0
                  }, null, 2)}</pre>
                </div>
                <div>
                  <div className="font-semibold mb-1 text-green-400">After</div>
                  <pre className="bg-slate-950/60 border border-white/10 rounded p-2 whitespace-pre-wrap break-words">{JSON.stringify({
                    ...(metaPayload?.meta?.after||{}),
                    sizeBytes: metaPayload?.afterStats?.stats?.sizeBytes || 0
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </Suspense>
  )
}