import { createApp } from 'vue'
import '@fontsource/press-start-2p'
import '@fontsource/fusion-pixel-12px-proportional-sc'
import '@fontsource/fira-code/400.css'
import '@fontsource/fira-code/700.css'
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
