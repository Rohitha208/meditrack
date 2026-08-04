"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function WaitingRoom( {onAppointmentClick}: {onAppointmentClick: (id: string) => void} ) {
  // Mock waiting room data
  const waitingRoomStats = {
    currentWaitTime: "23 min",
    patientsWaiting: 4,
    patientsInRooms: 6,
    roomUtilization: "75%",
  }

  const waitingPatients = [
    {
      id: 1,
      name: "Rocky",
      type: "Dog",
      owner: "James",
      appointment: "2:30 PM",
      reason: "Wound Check",
      waitingTime: "5 min",
      initials: "RS",
    },
    {
      id: 2,
      name: "Luna",
      type: "Cat",
      owner: "Sarah",
      appointment: "3:15 PM",
      reason: "Check-up",
      waitingTime: "12 min",
      initials: "LC",
    },
    {
      id: 3,
      name: "Cooper",
      type: "Dog",
      owner: "David",
      appointment: "4:00 PM",
      reason: "Allergy Consult",
      waitingTime: "18 min",
      initials: "CD",
    },
    {
      id: 4,
      name: "Milo",
      type: "Cat",
      owner: "Jessica",
      appointment: "4:30 PM",
      reason: "Vaccination",
      waitingTime: "25 min",
      initials: "ML",
    },
  ]

  const examinationRooms = [
    {
      id: 1,
      name: "Room 1",
      status: "In Progress",
      patient: "Bella (Cat)",
      reason: "Vaccination",
      provider: "Dr. Johnson",
    },
    {
      id: 2,
      name: "Room 2",
      status: "In Progress",
      patient: "Oscar (Cat)",
      reason: "Surgery",
      provider: "Dr. Johnson",
    },
    {
      id: 3,
      name: "Room 3",
      status: "In Progress",
      patient: "Max (Dog)",
      reason: "Dental",
      provider: "Dr. Chen",
    },
    {
      id: 4,
      name: "Room 4",
      status: "In Progress",
      patient: "Charlie (Dog)",
      reason: "X-Ray",
      provider: "Dr. Wilson",
    },
    {
      id: 5,
      name: "Room 5",
      status: "Available",
      patient: null,
      reason: null,
      provider: null,
    },
    {
      id: 6,
      name: "Room 6",
      status: "In Progress",
      patient: "Lucy (Dog)",
      reason: "Ultrasound",
      provider: "Dr. Chen",
    },
    {
      id: 7,
      name: "Room 7",
      status: "Cleaning",
      patient: null,
      reason: null,
      provider: null,
    },
    {
      id: 8,
      name: "Room 8",
      status: "Available",
      patient: null,
      reason: null,
      provider: null,
    },
  ]

  const getRoomCardClass = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      case "Available":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      case "Cleaning":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
    }
  }

  const getRoomTextClass = (status: string) => {
    switch (status) {
      case "In Progress":
        return "text-blue-700 dark:text-blue-400"
      case "Available":
        return "text-green-700 dark:text-green-400"
      case "Cleaning":
        return "text-purple-700 dark:text-purple-400"
      default:
        return "text-gray-700 dark:text-gray-400"
    }
  }

  return (
    <div className="p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Wait Time</div>
            <div className="text-3xl font-bold text-blue-500">{waitingRoomStats.currentWaitTime}</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Patients Waiting</div>
            <div className="text-3xl font-bold text-red-500">{waitingRoomStats.patientsWaiting}</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Patients In Rooms</div>
            <div className="text-3xl font-bold text-amber-500">{waitingRoomStats.patientsInRooms}</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Room Utilization</div>
            <div className="text-3xl font-bold text-green-500">{waitingRoomStats.roomUtilization}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Waiting Area */}
        <div>
          <div className="bg-slate-700 text-white p-3 rounded-t-lg">
            <h2 className="font-medium">Waiting Area ({waitingPatients.length} patients)</h2>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-b-lg shadow divide-y divide-gray-200 dark:divide-slate-700">
            {waitingPatients.map((patient) => (
              <div key={patient.id} className="p-4">
                <div className="flex items-start">
                  <Avatar className="h-12 w-12 bg-blue-100 text-blue-600 mr-4">
                    <AvatarFallback>{patient.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium">
                        {patient.name} ({patient.type})
                      </h3>
                      <span className="text-sm text-amber-600 dark:text-amber-400">Waiting: {patient.waitingTime}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Owner: {patient.owner}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Appointment: {patient.appointment} - {patient.reason}
                    </p>
                    <div className="mt-2 flex space-x-2">
                      <Button
                        variant="outline"
                        className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30"
                      >
                        Room Ready
                      </Button>
                      <Button variant="outline" className="theme-button-outline">
                        Patient Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Examination Rooms */}
        <div>
          <div className="bg-slate-700 text-white p-3 rounded-t-lg">
            <h2 className="font-medium">Examination Rooms ({examinationRooms.length} total)</h2>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-b-lg shadow p-4">
            <div className="grid grid-cols-2 gap-4">
              {examinationRooms.map((room) => (
                <Card key={room.id} className={`border ${getRoomCardClass(room.status)}`}>
                  <CardContent className="p-3">
                    <h3 className={`font-medium ${getRoomTextClass(room.status)}`}>{room.name}</h3>
                    {room.status === "Available" ? (
                      <div>
                        <p className="text-green-600 dark:text-green-400">Available</p>
                        <p className="text-green-600 dark:text-green-400">Ready</p>
                      </div>
                    ) : room.status === "Cleaning" ? (
                      <div>
                        <p className="text-purple-600 dark:text-purple-400">Cleaning in Progress</p>
                        <p className="text-amber-600 dark:text-amber-400">Available in 10 min</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium">
                          {room.patient} - {room.reason}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{room.provider} - In Progress</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
