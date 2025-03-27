'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Perfil() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.push('/login');
        return;
      }

      // Obtener datos del usuario desde la tabla usuario_nomina con relaciones
      const { data: userData, error: userError } = await supabase
        .from('usuario_nomina')
        .select(`
          *,
          empresas:empresa_id(nombre),
          sedes:sede_id(nombre),
          eps:eps_id(nombre),
          afp:afp_id(nombre),
          cesantias:cesantias_id(nombre),
          caja_de_compensacion:caja_de_compensacion_id(nombre)
        `)
        .eq('auth_user_id', session.user.id)
        .single();

      if (userError) {
        console.error('Error al obtener datos del usuario:', userError);
        return;
      }

      setUserData(userData);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <div className="text-2xl font-semibold text-gray-700">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-indigo-600">
          <h3 className="text-lg leading-6 font-medium text-white">Perfil del Usuario</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            {/* Información Personal */}
            <div className="sm:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Información Personal</h3>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Nombre</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.colaborador}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Cédula</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.cedula || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Correo electrónico</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.correo_electronico}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.telefono || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Género</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.genero || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Fecha de Nacimiento</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.fecha_nacimiento || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Edad</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.edad || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Grupo Sanguíneo (RH)</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.rh || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Dirección de Residencia</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.direccion_residencia || 'No disponible'}</dd>
            </div>
            
            {/* Información Laboral */}
            <div className="sm:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Información Laboral</h3>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Cargo</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.cargo || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Fecha de Ingreso</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.fecha_ingreso || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Empresa</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.empresas?.nombre || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Sede</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.sedes?.nombre || 'No disponible'}</dd>
            </div>
            
            {/* Información de Afiliaciones */}
            <div className="sm:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Afiliaciones</h3>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">EPS</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.eps?.nombre || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">AFP</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.afp?.nombre || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Cesantías</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.cesantias?.nombre || 'No disponible'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Caja de Compensación</dt>
              <dd className="mt-1 text-sm text-gray-900">{userData?.caja_de_compensacion?.nombre || 'No disponible'}</dd>
            </div>
          </dl>
          <div className="mt-8 flex justify-center">
            <button
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (!error) {
                  router.push('/login');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}