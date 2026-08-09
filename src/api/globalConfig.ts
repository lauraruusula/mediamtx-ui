import api from '@/api'

// Get global config
export const getGlobalConfig = () => api.get('/v3/config/global/get')

// Update global config
export const updateGlobalConfig = (config: any) => api.patch('/v3/config/global/patch', config)

// Get default values for global config (uses the get endpoint, since MediaMTX's API has no dedicated defaults endpoint)
export const getGlobalConfigDefaults = () => api.get('/v3/config/global/get')

// Get an example global config (uses the get endpoint, since MediaMTX's API has no dedicated example endpoint)
export const getGlobalConfigExample = () => {
  return api.get('/v3/config/global/get')
} 