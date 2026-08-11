import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import App from './App.vue'
import router from './router'
import './style.css'

// Initialize theme
const savedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const theme =
  savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : prefersDark ? 'dark' : 'light'
document.documentElement.classList.add(theme)
document.documentElement.setAttribute('data-theme', theme)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
