import React, { useState, useEffect } from 'react';
import { authenticatedRequest, API_BASE_URL } from '../../../config/api';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  position?: {
    id: number;
    name: string;
    code?: string;
  };
  department?: {
    id: number;
    name: string;
  };
}

interface AddProjectMemberModalProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
}

const AddProjectMemberModal: React.FC<AddProjectMemberModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onMemberAdded
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('DEVELOPER');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const roles = [
    { value: 'PRODUCT_OWNER', label: 'Product Owner', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '👑' },
    { value: 'SCRUM_MASTER', label: 'Scrum Master', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🎯' },
    { value: 'DEVELOPER', label: 'Desarrollador', color: 'bg-green-100 text-green-800 border-green-200', icon: '💻' },
    { value: 'TESTER', label: 'Tester/QA', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🧪' },
    { value: 'DESIGNER', label: 'Diseñador', color: 'bg-pink-100 text-pink-800 border-pink-200', icon: '🎨' },
    { value: 'STAKEHOLDER', label: 'Stakeholder', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '👔' },
    { value: 'INFRAESTRUCTURA', label: 'Infraestructura', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: '🏗️' },
    { value: 'REDES', label: 'Redes', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: '🌐' },
    { value: 'SEGURIDAD', label: 'Seguridad', color: 'bg-red-100 text-red-800 border-red-200', icon: '🔒' }
  ];

  // Cargar usuarios disponibles
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen, projectId]);

  // Filtrar usuarios por búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.position?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      setError(null);


      // Obtener todos los usuarios con un límite alto para obtener todos
      const allUsersResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/users?limit=1000&isActive=true`);
      
      // Manejar diferentes estructuras de respuesta
      let allUsers: User[] = [];
      if (allUsersResponse?.data?.users) {
        allUsers = allUsersResponse.data.users;
      } else if (allUsersResponse?.users) {
        allUsers = allUsersResponse.users;
      } else if (Array.isArray(allUsersResponse)) {
        allUsers = allUsersResponse;
      } else {
        allUsers = [];
      }


      // Obtener miembros actuales del proyecto
      let currentMembers: any[] = [];
      try {
        const membersResponse = await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${projectId}/members`);
        
        // El endpoint devuelve: { success: true, data: { members: [...] }, message: "..." }
        if (membersResponse?.data?.members) {
          currentMembers = membersResponse.data.members;
        } else if (Array.isArray(membersResponse)) {
          currentMembers = membersResponse;
        } else if (membersResponse?.members) {
          currentMembers = membersResponse.members;
        }
      } catch (membersErr: any) {
        // Continuar sin filtrar miembros si falla
      }

      const memberIds = currentMembers
        .map((m: any) => m?.user?.id || m?.userId)
        .filter((id: any) => id != null);
      

      // Filtrar usuarios que no son miembros y están activos
      const availableUsers = allUsers.filter((user: User) => 
        user.id != null && !memberIds.includes(user.id)
      );
      
      
      setUsers(availableUsers);
      setFilteredUsers(availableUsers);
    } catch (err: any) {
      setError(`Error al cargar la lista de usuarios: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('Por favor, selecciona un usuario');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await authenticatedRequest(`${API_BASE_URL}/scrum/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole
        })
      });

      // Limpiar formulario
      setSelectedUserId(null);
      setSelectedRole('DEVELOPER');
      setSearchTerm('');
      
      // Notificar éxito
      onMemberAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al agregar miembro al proyecto');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUserId(user.id);
    setSearchTerm(user.name);
    setShowDropdown(false);
  };

  const getSelectedRole = () => {
    return roles.find(r => r.value === selectedRole);
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0264C5] to-[#11C0F1] px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-xl font-chatgpt-semibold text-white">
                  Agregar Miembro al Proyecto
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-700 text-sm font-chatgpt-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Selector de Usuario */}
            <div className="space-y-2">
              <label className="block text-sm font-chatgpt-semibold text-gray-900">
                Seleccionar Usuario *
              </label>
              
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      if (e.target.value === '') {
                        setSelectedUserId(null);
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={loadingUsers ? 'Cargando usuarios...' : 'Buscar por nombre, email o puesto...'}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0264C5] focus:border-transparent transition-all"
                    disabled={loadingUsers}
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    {loadingUsers ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0264C5]"></div>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Dropdown de usuarios */}
                {showDropdown && !loadingUsers && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-4 py-3 hover:bg-[#F2ECDF] transition-colors flex items-center space-x-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-10 h-10 bg-gradient-to-r from-[#0264C5] to-[#11C0F1] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-chatgpt-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-chatgpt-semibold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-600">{user.email}</p>
                          {user.position?.name && (
                            <p className="text-xs text-gray-500">{user.position.name}</p>
                          )}
                        </div>
                        {user.department && (
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                            {user.department.name}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && !loadingUsers && filteredUsers.length === 0 && searchTerm && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-center">
                    <p className="text-gray-500 text-sm">No se encontraron usuarios</p>
                  </div>
                )}
              </div>

              {/* Usuario seleccionado */}
              {selectedUser && (
                <div className="mt-3 p-4 bg-gradient-to-r from-[#F2ECDF] to-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#0264C5] to-[#11C0F1] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-chatgpt-semibold text-lg">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-chatgpt-semibold text-gray-900">{selectedUser.name}</p>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                      {selectedUser.position?.name && (
                        <p className="text-sm text-gray-500">{selectedUser.position.name}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(null);
                        setSearchTerm('');
                      }}
                      className="text-red-600 hover:bg-red-100 rounded-full p-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selector de Rol */}
            <div className="space-y-2">
              <label className="block text-sm font-chatgpt-semibold text-gray-900">
                Rol en el Proyecto *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      selectedRole === role.value
                        ? 'border-[#0264C5] bg-[#0264C5]/5 shadow-md scale-105'
                        : 'border-gray-200 hover:border-[#0264C5]/50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{role.icon}</span>
                      <div className="flex-1 text-left">
                        <p className={`font-chatgpt-semibold text-sm ${selectedRole === role.value ? 'text-[#0264C5]' : 'text-gray-900'}`}>
                          {role.label}
                        </p>
                      </div>
                      {selectedRole === role.value && (
                        <svg className="w-5 h-5 text-[#0264C5]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer - Botones */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-chatgpt-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-[#0264C5] to-[#11C0F1] text-white rounded-xl font-chatgpt-semibold hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={loading || !selectedUserId}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Agregando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Agregar Miembro</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProjectMemberModal;

