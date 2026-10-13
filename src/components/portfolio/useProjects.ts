'use client'
import { useEffect, useState } from 'react'
import type { Project } from '@/types'
export function useProjects(initial: Project[]) {
  const [added, setAdded] = useState<Project[]>([])
  useEffect(() => {
    let active = true
    fetch('/api/projects', { cache: 'no-store' }).then(r => r.ok ? r.json() : { projects: [] }).then(data => { if (active && Array.isArray(data.projects)) setAdded(data.projects) }).catch(() => {})
    return () => { active = false }
  }, [])
  return [...added, ...initial]
}
