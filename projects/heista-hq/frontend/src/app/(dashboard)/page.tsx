"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cpu, HardDrive, MessageSquare, Twitter, Activity, Zap } from "lucide-react"
import { useEffect, useState } from "react"

export default function Dashboard() {
  const [vpsHealth, setVpsHealth] = useState({ cpu: 45, ram: 62 })
  const [tokenUsage, setTokenUsage] = useState(78)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 auto-rows-min">
      {/* 1. Quick Swarm Summary - Large Card */}
      <Card className="md:col-span-2 lg:col-span-2 border-primary/20 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Quick Swarm Summary</CardTitle>
          <Zap className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Active Agents</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Tasks Done</p>
                <p className="text-2xl font-bold">142</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Swarm Efficiency</span>
                <span className="font-bold text-primary">94%</span>
              </div>
              <div className="h-2 w-full bg-accent/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. AI Token Usage - Progress */}
      <Card className="border-secondary/20 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Token Usage</CardTitle>
          <Activity className="h-5 w-5 text-secondary" />
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="relative h-24 w-24">
            <svg className="h-full w-full" viewBox="0 0 36 36">
              <path
                className="stroke-muted"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-secondary"
                strokeWidth="3"
                strokeDasharray={`${tokenUsage}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold">{tokenUsage}%</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            782.4k / 1M tokens used
          </p>
        </CardContent>
      </Card>

      {/* 3. VPS Health - System Metrics */}
      <Card className="border-border bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">VPS Health</CardTitle>
          <Cpu className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</span>
              <span>{vpsHealth.cpu}%</span>
            </div>
            <div className="h-1.5 w-full bg-accent/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${vpsHealth.cpu}%` }}></div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> RAM</span>
              <span>{vpsHealth.ram}%</span>
            </div>
            <div className="h-1.5 w-full bg-accent/20 rounded-full overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${vpsHealth.ram}%` }}></div>
            </div>
          </div>
          <Badge variant="outline" className="w-full justify-center py-1 bg-green-500/10 text-green-500 border-green-500/20">
            System Online
          </Badge>
        </CardContent>
      </Card>

      {/* 4. News & Twitter Trends - Feed Area */}
      <Card className="md:col-span-4 lg:col-span-4 border-border bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Feeds & Trends</CardTitle>
          <div className="flex gap-2">
             <Badge variant="secondary" className="bg-secondary/20 text-secondary border-none">Twitter</Badge>
             <Badge variant="outline">Web3 News</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Twitter className="h-4 w-4" /> Trending Topics</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-accent/5 border border-border">
                    <span className="text-sm font-medium">#AI_Agents_Revolution</span>
                    <Badge variant="outline">12.4k posts</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Latest News</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1 p-3 rounded-lg bg-accent/5 border border-border">
                    <p className="text-sm font-medium">Next-gen Swarm Protocols released by DeepMind</p>
                    <p className="text-xs text-muted-foreground">2 hours ago • TechCrunch</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
