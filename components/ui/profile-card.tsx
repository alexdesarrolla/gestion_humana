import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Briefcase,
  Heart,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Droplet,
  Building,
  MapPinned,
  CreditCard,
} from "lucide-react"

interface ProfileCardProps {
  userData: any
}

export function ProfileCard({ userData }: ProfileCardProps) {
  if (!userData) return null

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="bg-primary/5 pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{userData?.colaborador}</CardTitle>
              <p className="text-muted-foreground">{userData?.cargo || "Sin cargo asignado"}</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-sm">
            {userData?.empresas?.nombre || "Empresa no asignada"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Información Personal</TabsTrigger>
            <TabsTrigger value="laboral">Información Laboral</TabsTrigger>
            <TabsTrigger value="afiliaciones">Afiliaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cédula</p>
                  <p className="text-sm font-medium">{userData?.cedula || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Correo electrónico</p>
                  <p className="text-sm font-medium">{userData?.correo_electronico || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                  <p className="text-sm font-medium">{userData?.telefono || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Género</p>
                  <p className="text-sm font-medium">{userData?.genero || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                  <p className="text-sm font-medium">{userData?.fecha_nacimiento || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Edad</p>
                  <p className="text-sm font-medium">{userData?.edad || "No disponible"} años</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Droplet className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Grupo Sanguíneo (RH)</p>
                  <p className="text-sm font-medium">{userData?.rh || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dirección de Residencia</p>
                  <p className="text-sm font-medium">{userData?.direccion_residencia || "No disponible"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="laboral" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cargo</p>
                  <p className="text-sm font-medium">{userData?.cargo || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</p>
                  <p className="text-sm font-medium">{userData?.fecha_ingreso || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                  <p className="text-sm font-medium">{userData?.empresas?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPinned className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sede</p>
                  <p className="text-sm font-medium">{userData?.sedes?.nombre || "No disponible"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="afiliaciones" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">EPS</p>
                  <p className="text-sm font-medium">{userData?.eps?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AFP</p>
                  <p className="text-sm font-medium">{userData?.afp?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cesantías</p>
                  <p className="text-sm font-medium">{userData?.cesantias?.nombre || "No disponible"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Caja de Compensación</p>
                  <p className="text-sm font-medium">{userData?.caja_de_compensacion?.nombre || "No disponible"}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

