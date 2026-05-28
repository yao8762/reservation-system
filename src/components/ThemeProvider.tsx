"use client"

import { useEffect } from "react"

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 從環境變數讀取顏色主題，無則用預設值
    const colors = [
      ["--color-primary", process.env.NEXT_PUBLIC_COLOR_PRIMARY || "#8B7355"],
      ["--color-secondary", process.env.NEXT_PUBLIC_COLOR_SECONDARY || "#C4A77D"],
      ["--color-accent", process.env.NEXT_PUBLIC_COLOR_ACCENT || "#E8D5B7"],
      ["--color-background", process.env.NEXT_PUBLIC_COLOR_BACKGROUND || "#FDF8F3"],
      ["--color-text", process.env.NEXT_PUBLIC_COLOR_TEXT || "#4A4039"],
      ["--color-success", process.env.NEXT_PUBLIC_COLOR_SUCCESS || "#7D9B76"],
    ]
    const root = document.documentElement
    colors.forEach(([prop, value]) => {
      root.style.setProperty(prop, value)
    })

    // 讀取商家名稱 & 描述，寫入 dataset 供他處取用
    const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "🌿 身心靈預約"
    const businessDesc = process.env.NEXT_PUBLIC_BUSINESS_DESC || "專業按摩・美容服務"
    root.dataset.businessName = businessName
    root.dataset.businessDesc = businessDesc
  }, [])

  return <>{children}</>
}