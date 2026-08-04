"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, User, CheckCircle2 } from "lucide-react"

export default function RoomView( {onAppointmentClick}: {onAppointmentClick: (id: string) => void} ) {
  const [colorTheme, setColorTheme] = useState("purple")
  const [mounted, setMounted] = useState(false)

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
  }, [])

  // Mock room data
  const roomStats = {
    totalRooms: 8,
    roomsInUse: 6,
    availableRooms: 2,
    utilization: "75%",
  }

  const rooms = [
    {
      id: 1,
      name: "Room 1",
      status: "In Progress",
      patient: "Bella (Cat)",
      visitType: "Vaccination",
      owner: "James Wilson",
      provider: "Dr. Johnson",
      startTime: "2:15 PM",
      endTime: "2:45 PM",
      timeRemaining: "15 min left",
      progress: 65,
      color: "blue",
    },
    {
      id: 2,
      name: "Room 2",
      status: "In Progress",
      patient: "Oscar (Cat)",
      visitType: "Surgery",
      owner: "Emma Thomas",
      provider: "Dr. Johnson",
      startTime: "1:30 PM",
      endTime: "3:00 PM",
      timeRemaining: "45 min left",
      progress: 50,
      color: "red",
    },
    {
      id: 3,
      name: "Room 3",
      status: "In Progress",
      patient: "Max (Dog)",
      visitType: "Dental",
      owner: "Robert Garcia",
      provider: "Dr. Chen",
      startTime: "2:00 PM",
      endTime: "3:30 PM",
      timeRemaining: "75 min left",
      progress: 40,
      color: "blue",
    },
    {
      id: 4,
      name: "Room 4",
      status: "In Progress",
      patient: "Charlie (Dog)",
      visitType: "X-Ray",
      owner: "Patricia Lee",
      provider: "Dr. Wilson",
      startTime: "2:30 PM",
      endTime: "3:15 PM",
      timeRemaining: "30 min left",
      progress: 55,
      color: "blue",
    },
    {
      id: 5,
      name: "Room 5",
      status: "Available",
      patient: null,
      visitType: null,
      owner: null,
      provider: null,
      startTime: null,
      endTime: null,
      timeRemaining: null,
      progress: null,
      readySince: "10:30 AM",
      color: "green",
    },
    {
      id: 6,
      name: "Room 6",
      status: "In Progress",
      patient: "Lucy (Dog)",
      visitType: "Ultrasound",
      owner: "Michael Kim",
      provider: "Dr. Chen",
      startTime: "2:45 PM",
      endTime: "3:30 PM",
      timeRemaining: "30 min left",
      progress: 25,
      color: "blue",
    },
    {
      id: 7,
      name: "Room 7",
      status: "Cleaning",
      patient: null,
      visitType: null,
      owner: null,
      provider: null,
      startTime: null,
      endTime: null,
      timeRemaining: null,
      progress: null,
      availableIn: "10 min",
      color: "purple",
    },
    {
      id: 8,
      name: "Room 8",
      status: "Available",
      patient: null,
      visitType: null,
      owner: null,
      provider: null,
      startTime: null,
      endTime: null,
      timeRemaining: null,
      progress: null,
      readySince: "1:15 PM",
      color: "green",
    },
  ]

  // Stats cards data
  const statsCards = [
    {
      title: "Total Rooms",
      value: roomStats.totalRooms,
      color: "blue",
      icon: "📋",
    },
    {
      title: "Rooms In Use",
      value: roomStats.roomsInUse,
      color: "red",
      icon: "🔴",
    },
    {
      title: "Available Rooms",
      value: roomStats.availableRooms,
      color: "green",
      icon: "✓",
    },
    {
      title: "Room Utilization",
      value: roomStats.utilization,
      color: "amber",
      icon: "📊",
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">In Progress</span>
      case "Available":
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">Available</span>
      case "Cleaning":
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Cleaning</span>
      default:
        return null
    }
  }

  const getProgressBarColor = (color: string) => {
    switch (color) {
      case "red":
        return "bg-red-500"
      case "blue":
        return "bg-blue-500"
      case "green":
        return "bg-green-500"
      case "purple":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const getHeaderColor = (color: string) => {
    switch (color) {
      case "red":
        return "border-t-4 border-t-red-500"
      case "blue":
        return "border-t-4 border-t-blue-500"
      case "green":
        return "border-t-4 border-t-green-500"
      case "purple":
        return "border-t-4 border-t-purple-500"
      case "amber":
        return "border-t-4 border-t-amber-500"
      default:
        return "border-t-4 border-t-gray-500"
    }
  }

  // If not mounted yet, don't render to avoid hydration mismatch
  if (!mounted) return null

  return (
    <div className="p-6">
      {/* Room Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Rooms</div>
            <div className="text-4xl font-bold text-blue-500">8</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Rooms In Use</div>
            <div className="text-4xl font-bold text-red-500">6</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Rooms</div>
            <div className="text-4xl font-bold text-green-500">2</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Room Utilization</div>
            <div className="text-4xl font-bold text-amber-500">75%</div>
          </CardContent>
        </Card>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm ${getHeaderColor(room.color)}`}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900 dark:text-white">{room.name}</h3>
                {getStatusBadge(room.status)}
              </div>

              {room.status === "Available" ? (
                <div>
                  <div className="flex items-center text-green-600 mb-2">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <span className="font-medium">Ready for next patient</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 ml-7 mb-8">Available since {room.readySince}</div>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" className="w-1/2 h-10 whitespace-nowrap">
                      Assign Patient
                    </Button>
                    <Button variant="outline" className="w-1/2 h-10 whitespace-nowrap text-amber-500 border-amber-500">
                      Mark Unavailable
                    </Button>
                  </div>
                </div>
              ) : room.status === "Cleaning" ? (
                <div>
                  <div className="flex items-center text-purple-600 mb-2">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="font-medium">Cleaning in Progress</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 ml-7 mb-8">Available in {room.availableIn}</div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-8">
                    <div className="h-full bg-purple-500 rounded-full w-3/4"></div>
                  </div>
                  <Button className="w-full h-10 theme-button text-white">Mark as Ready</Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">{room.patient}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className={room.visitType === "Surgery" ? "text-red-600" : "text-gray-600"}>
                      {room.visitType}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400 mb-2">
                    <User className="h-4 w-4 mr-1" />
                    <span>{room.owner}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {room.startTime} - {room.endTime}
                    </div>
                    <div className={room.visitType === "Surgery" ? "text-red-600" : "text-blue-600"}>
                      {room.timeRemaining}
                    </div>
                  </div>
                  <div className="text-sm font-medium mb-2">{room.provider} - In Progress</div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                    <div
                      className={`h-full ${getProgressBarColor(room.color)} rounded-full`}
                      style={{ width: `${room.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button variant="outline" className="w-1/2 h-10 whitespace-nowrap">
                      Patient Details
                    </Button>
                    <Button className="w-1/2 h-10 whitespace-nowrap theme-button text-white">Mark Complete</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
