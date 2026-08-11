import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type ThemeType = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  // Get the initial theme from local storage, falling back to the system preference
  const getDefaultTheme = (): ThemeType => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme

    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const currentTheme = ref<ThemeType>(getDefaultTheme())

  // Toggle theme
  const toggleTheme = () => {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
  }

  // Set a specific theme
  const setTheme = (theme: ThemeType) => {
    currentTheme.value = theme
  }

  // Watch for theme changes, updating the DOM and local storage
  watch(
    currentTheme,
    newTheme => {
      // Update the HTML element's class
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(newTheme)

      // Update the Element Plus theme
      document.documentElement.setAttribute('data-theme', newTheme)

      // Persist to local storage
      localStorage.setItem('theme', newTheme)
    },
    { immediate: true }
  )

  return {
    currentTheme,
    toggleTheme,
    setTheme
  }
})
