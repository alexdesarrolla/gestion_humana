'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface Empresa {
  id: number;
  nombre: string;
}

interface Sede {
  id: number;
  nombre: string;
}

interface EPS {
  id: number;
  nombre: string;
}

interface AFP {
  id: number;
  nombre: string;
}

interface CajaCompensacion {
  id: number;
  nombre: string;
}

export default function Register() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [eps, setEps] = useState<EPS[]>([]);
  const [afps, setAfps] = useState<AFP[]>([]);
  const [cajaDeCompensacionOptions, setCajaDeCompensacionOptions] = useState<CajaCompensacion[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    confirmPassword: '',
    rol: 'usuario',
    genero: '',
    cedula: '',
    fecha_ingreso: '',
    empresa_id: '',
    cargo: '',
    sede_id: '',
    fecha_nacimiento: '',
    edad: '',
    rh: '',
    eps_id: '',
    afp_id: '',
    cesantias_id: '',
    caja_de_compensacion_id: '',
    direccion_residencia: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('id, nombre')
        .order('nombre');

      if (empresasError) {
        console.error('Error al obtener empresas:', empresasError);
        return;
      }

      setEmpresas(empresasData || []);

      const { data: sedesData, error: sedesError } = await supabase
        .from('sedes')
        .select('id, nombre')
        .order('nombre');

      if (sedesError) {
        console.error('Error al obtener sedes:', sedesError);
        return;
      }

      setSedes(sedesData || []);

      const { data: epsData, error: epsError } = await supabase
        .from('eps')
        .select('id, nombre')
        .order('nombre');

      if (epsError) {
        console.error('Error al obtener eps:', epsError);
        return;
      }

      setEps(epsData || []);

      const { data: afpsData, error: afpsError } = await supabase
        .from('afp')
        .select('id, nombre')
        .order('nombre');

      if (afpsError) {
        console.error('Error al obtener afps:', afpsError);
        return;
      }

      setAfps(afpsData || []);

      const { data: cajasData, error: cajasError } = await supabase
        .from('caja_de_compensacion')
        .select('id, nombre')
        .order('nombre');

      if (cajasError) {
        console.error('Error al obtener cajas de compensación:', cajasError);
        return;
      }

      setCajaDeCompensacionOptions(cajasData || []);
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.correo,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: dbError } = await supabase
          .from('usuario_nomina')
          .insert([
            {
              colaborador: formData.nombre,
              correo_electronico: formData.correo,
              telefono: formData.telefono,
              auth_user_id: authData.user.id,
              user_id: authData.user.id,
              rol: formData.rol,
              genero: formData.genero || null,
              cedula: formData.cedula || null,
              fecha_ingreso: formData.fecha_ingreso || null,
              empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
              cargo: formData.cargo || null,
              sede_id: formData.sede_id ? parseInt(formData.sede_id) : null,
              fecha_nacimiento: formData.fecha_nacimiento || null,
              edad: formData.edad ? parseInt(formData.edad) : null,
              rh: formData.rh || null,
              eps_id: formData.eps_id || null,
              afp_id: formData.afp_id || null,
              cesantias_id: formData.cesantias_id ? parseInt(formData.cesantias_id) : null,
              caja_de_compensacion_id: formData.caja_de_compensacion_id ? parseInt(formData.caja_de_compensacion_id) : null,
              direccion_residencia: formData.direccion_residencia || null
            }
          ]);

        if (dbError) throw dbError;
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Registro de Usuario
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">Usuario registrado exitosamente</span>
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Campos obligatorios */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre completo *
              </label>
              <div className="mt-1">
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico *
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                Teléfono *
              </label>
              <div className="mt-1">
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
                Rol *
              </label>
              <div className="mt-1">
                <select
                  id="rol"
                  name="rol"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                >
                  <option value="usuario">Usuario</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña *
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña *
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Campos opcionales */}
            <div className="space-y-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Información adicional</h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="genero" className="block text-sm font-medium text-gray-700">
                    Género
                  </label>
                  <div className="mt-1">
                    <select
                      id="genero"
                      name="genero"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.genero}
                      onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="cedula" className="block text-sm font-medium text-gray-700">
                    Cédula
                  </label>
                  <div className="mt-1">
                    <input
                      id="cedula"
                      name="cedula"
                      type="text"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="fecha_ingreso" className="block text-sm font-medium text-gray-700">
                    Fecha de Ingreso
                  </label>
                  <div className="mt-1">
                    <input
                      id="fecha_ingreso"
                      name="fecha_ingreso"
                      type="date"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.fecha_ingreso}
                      onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                    Empresa
                  </label>
                  <div className="mt-1">
                    <select
                      id="empresa_id"
                      name="empresa_id"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.empresa_id}
                      onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="cargo" className="block text-sm font-medium text-gray-700">
                    Cargo
                  </label>
                  <div className="mt-1">
                    <input
                      id="cargo"
                      name="cargo"
                      type="text"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sede" className="block text-sm font-medium text-gray-700">
                    Sede
                  </label>
                  <div className="mt-1">
                    <select
                      id="sede"
                      name="sede"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.sede_id || ''}
                      onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    >
                      <option value="">Seleccione una sede</option>
                      {sedes.map((sede) => (
                        <option key={sede.id} value={sede.id}>
                          {sede.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700">
                    Fecha de Nacimiento
                  </label>
                  <div className="mt-1">
                    <input
                      id="fecha_nacimiento"
                      name="fecha_nacimiento"
                      type="date"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.fecha_nacimiento}
                      onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edad" className="block text-sm font-medium text-gray-700">
                    Edad
                  </label>
                  <div className="mt-1">
                    <input
                      id="edad"
                      name="edad"
                      type="number"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.edad}
                      onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rh" className="block text-sm font-medium text-gray-700">
                    RH
                  </label>
                  <div className="mt-1">
                    <select
                      id="rh"
                      name="rh"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.rh}
                      onChange={(e) => setFormData({ ...formData, rh: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="eps" className="block text-sm font-medium text-gray-700">
                    EPS
                  </label>
                  <div className="mt-1">
                    <select
                      id="eps"
                      name="eps"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.eps_id}
                      onChange={(e) => setFormData({ ...formData, eps_id: e.target.value })}
                    >
                      <option value="">Seleccione una EPS</option>
                      {eps.map((eps) => (
                        <option key={eps.id} value={eps.id}>
                          {eps.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="afp" className="block text-sm font-medium text-gray-700">
                    AFP
                  </label>
                  <div className="mt-1">
                    <select
                      id="afp"
                      name="afp"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.afp_id}
                      onChange={(e) => setFormData({ ...formData, afp_id: e.target.value })}
                    >
                      <option value="">Seleccione una AFP</option>
                      {afps.map((afp) => (
                        <option key={afp.id} value={afp.id}>
                          {afp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="cesantias_id" className="block text-sm font-medium text-gray-700">
                    Cesantías
                  </label>
                  <div className="mt-1">
                    <select
                      id="cesantias_id"
                      name="cesantias_id"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.cesantias_id}
                      onChange={(e) => setFormData({ ...formData, cesantias_id: e.target.value })}
                    >
                      <option value="">Seleccione una opción</option>
                      <option value="1">COLFONDOS</option>
                      <option value="2">COLPENSIONES</option>
                      <option value="3">FNA</option>
                      <option value="4">NA</option>
                      <option value="5">PORVENIR</option>
                      <option value="6">PROTECCION</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="caja_de_compensacion" className="block text-sm font-medium text-gray-700">
                    Caja de Compensación
                  </label>
                  <div className="mt-1">
                    <select
                      id="caja_de_compensacion"
                      name="caja_de_compensacion"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.caja_de_compensacion_id}
                      onChange={(e) => setFormData({ ...formData, caja_de_compensacion_id: e.target.value })}
                    >
                      <option value="">Seleccione una opción</option>
                      {cajaDeCompensacionOptions.map((caja) => (
                        <option key={caja.id} value={caja.id}>
                          {caja.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>


                <div className="sm:col-span-2">
                  <label htmlFor="direccion_residencia" className="block text-sm font-medium text-gray-700">
                    Dirección de Residencia
                  </label>
                  <div className="mt-1">
                    <input
                      id="direccion_residencia"
                      name="direccion_residencia"
                      type="text"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.direccion_residencia}
                      onChange={(e) => setFormData({ ...formData, direccion_residencia: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

}