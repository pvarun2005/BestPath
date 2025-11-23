import axios from 'axios'

const baseUrl = process.env.PY_AGENT_URL || 'http://127.0.0.1:5050'

export async function parseIntent(text: string): Promise<{ success: boolean; content?: string; error?: string }>{
  try {
    const res = await axios.post(`${baseUrl}/intent`, { text })
    return res.data
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function optimize(text: string): Promise<{ success: boolean; content?: string; error?: string }>{
  try {
    const res = await axios.post(`${baseUrl}/optimize`, { text })
    return res.data
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function health(): Promise<{ success: boolean; sudo: string } | { success: false; error: string }>{
  try {
    const res = await axios.get(`${baseUrl}/health`)
    return res.data
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function optimizeRoute(payload: any): Promise<any>{
  const res = await axios.post(`${baseUrl}/optimize-route`, payload)
  return res.data
}