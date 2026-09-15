import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/press-start-2p'
import '@fontsource/fusion-pixel-12px-proportional-sc'
import '@fontsource/fira-code/400.css'
import '@fontsource/fira-code/700.css'
import './style.css'
import App from './App'

// biome-ignore lint/style/noNonNullAssertion: index.html 里保证了 #app 存在
const container = document.getElementById('app')!

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
