import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { UploadPage } from './pages/Upload'
import { TablePage, CatalogPage } from './pages/Table'
import { GuidePage } from './pages/Guide'
import { AboutPage } from './pages/About'
import { useStore } from './state/store'

export default function App() {
  const theme = useStore((s) => s.theme)
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<GuidePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/table/:name" element={<TablePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<GuidePage />} />
        </Routes>
      </Shell>
    </HashRouter>
  )
}
