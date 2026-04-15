import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMonitor(userId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)

  const fetchLatest = useCallback(async () => {
    if (!userId) return
    const { data: score } = await supabase
      .from('stress_scores')
      .select(`
        *,
        sensor_readings ( bpm, spo2, hrv_rmssd ),
        env_readings ( temperature, aqi_us_epa, co, no2, o3, pm2_5, pm10 )
      `)
      .eq('user_id', userId)
      .order('scored_at', { ascending: false })
      .limit(1)
      .single()

    if (score) setData(score)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchLatest()

    const channel = supabase
      .channel(`stress_scores:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'stress_scores',
        filter: `user_id=eq.${userId}`,
      }, async ({ new: row }) => {
        const { data: enriched } = await supabase
          .from('stress_scores')
          .select(`
            *,
            sensor_readings ( bpm, spo2, hrv_rmssd ),
            env_readings ( temperature, aqi_us_epa, co, no2, o3, pm2_5, pm10 )
          `)
          .eq('id', row.id)
          .single()
        if (enriched) setData(enriched)
      })
      .subscribe(status => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => supabase.removeChannel(channel)
  }, [userId, fetchLatest])

  return { data, loading, connected, refetch: fetchLatest }
}
