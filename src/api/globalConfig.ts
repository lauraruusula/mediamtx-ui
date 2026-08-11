import api from '@/api'

// Get global config
export const getGlobalConfig = () => api.get('/v3/config/global/get')

// Update global config
export const updateGlobalConfig = (config: any) => api.patch('/v3/config/global/patch', config)
