"use client"
import { useContext, useState } from "react";
import { PatientDashboardContext } from "@/components/pawtrack/patientDashboard/PatientDashboardProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PawPrint, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NewPatientForm } from "@/components/pawtrack/patients/new-patient-form";

export default function MyPetsPage() {
  const { pets, petsLoading, petsError, isClient, clientId, refetchPets } = useContext(PatientDashboardContext);
  const [isNewPetFormOpen, setIsNewPetFormOpen] = useState(false);

  // Helper
  const calculateAge = (dateOfBirth: string) => {
    if (!isClient || !dateOfBirth) return 'Unknown';
    try {
      return `${Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years`;
    } catch {
      return 'Unknown';
    }
  };

  const handleNewPetSuccess = () => {
    refetchPets();
    setIsNewPetFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">My Pets</h2>
        <Button className="theme-button text-white" onClick={() => setIsNewPetFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Register New Pet
        </Button>
      </div>
      {petsLoading ? (
        <div>Loading pets...</div>
      ) : petsError ? (
        <div>Error loading pets.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pets.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <PawPrint className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No pets registered yet</h3>
              <p className="text-gray-500 mt-1 mb-4">Register your pet to book appointments and access medical records</p>
              <Button className="theme-button text-white" onClick={() => setIsNewPetFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register Your First Pet
              </Button>
            </div>
          ) : (
            pets.map((pet: any) => (
              <Card key={pet.id} className="bg-white shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#1E3D3D] to-[#1E3D3D] text-white">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-white">
                      <AvatarFallback className="bg-white text-[#1E3D3D] text-lg font-bold">
                        {pet.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-white">{pet.name}</CardTitle>
                      <CardDescription className="text-[#D2EFEC]">{pet.breed}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Age</p>
                      <p className="text-lg font-semibold">
                        {isClient && pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Weight</p>
                      <p className="text-lg font-semibold">
                        {pet.weightKg ? `${pet.weightKg} kg` : "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      <Sheet open={isNewPetFormOpen} onOpenChange={setIsNewPetFormOpen}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[40%] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Register New Pet</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <NewPatientForm 
              onSuccess={handleNewPetSuccess} 
              defaultClientId={clientId}
              hideOwnerSection={true}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
