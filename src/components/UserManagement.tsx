import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Users, Building2, Package, Plus, Edit, Trash2, Building } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Company {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string | null;
  department_id: string | null;
  unit_id: string | null;
  company_id: string | null;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  budget: number | null;
  company_id: string;
}

interface Unit {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  departments?: { name: string };
}

const UserManagement = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: '',
    description: ''
  });

  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
    budget: '',
    company_id: ''
  });

  const [unitForm, setUnitForm] = useState({
    name: '',
    description: '',
    department_id: ''
  });

  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    department_id: '',
    unit_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (companiesError) throw companiesError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch departments
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (departmentsError) throw departmentsError;

      // Fetch units with department names
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          *,
          departments (
            name
          )
        `)
        .order('name');

      if (unitsError) throw unitsError;

      setCompanies(companiesData || []);
      setProfiles(profilesData || []);
      setDepartments(departmentsData || []);
      setUnits(unitsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (profileData: { department_id: string | null; unit_id: string | null }) => {
    if (!selectedProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          department_id: profileData.department_id === 'unassigned' ? null : profileData.department_id,
          unit_id: profileData.unit_id === 'unassigned' ? null : profileData.unit_id
        })
        .eq('user_id', selectedProfile.user_id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso.",
      });

      setIsDialogOpen(false);
      setSelectedProfile(null);
      fetchData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário.",
        variant: "destructive",
      });
    }
  };

  const handleCreateCompany = async () => {
    try {
      const { error } = await supabase
        .from('companies')
        .insert({
          name: companyForm.name,
          description: companyForm.description || null
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Empresa criada com sucesso.",
      });

      setCompanyForm({ name: '', description: '' });
      setIsCompanyDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar empresa.",
        variant: "destructive",
      });
    }
  };

  const handleCreateDepartment = async () => {
    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          name: departmentForm.name,
          description: departmentForm.description || null,
          budget: departmentForm.budget ? parseFloat(departmentForm.budget) : null,
          company_id: departmentForm.company_id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Departamento criado com sucesso.",
      });

      setDepartmentForm({ name: '', description: '', budget: '', company_id: '' });
      setIsDeptDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating department:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar departamento.",
        variant: "destructive",
      });
    }
  };

  const handleCreateUnit = async () => {
    try {
      const { error } = await supabase
        .from('units')
        .insert({
          name: unitForm.name,
          description: unitForm.description || null,
          department_id: unitForm.department_id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Unidade criada com sucesso.",
      });

      setUnitForm({ name: '', description: '', department_id: '' });
      setIsUnitDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating unit:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar unidade.",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.full_name) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user account through Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            full_name: userForm.full_name,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            full_name: userForm.full_name,
            role: userForm.role,
            department_id: userForm.department_id || null,
            unit_id: userForm.unit_id || null,
          });

        if (profileError) throw profileError;

        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso!",
        });

        setUserForm({
          email: '',
          password: '',
          full_name: '',
          role: 'user',
          department_id: '',
          unit_id: ''
        });
        setIsUserDialogOpen(false);
        fetchData();
      }
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive",
      });
    }
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'Não atribuído';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Desconhecido';
  };

  const getUnitName = (unitId: string | null) => {
    if (!unitId) return 'Não atribuído';
    const unit = units.find(u => u.id === unitId);
    return unit?.name || 'Desconhecido';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie usuários, departamentos e unidades do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Unidades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>
                  Visualize e gerencie a atribuição de usuários a departamentos e unidades
                </CardDescription>
              </div>
              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                      Adicione um novo usuário ao sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email *</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                        placeholder="usuario@exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-password">Senha *</Label>
                      <Input
                        id="user-password"
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-name">Nome Completo *</Label>
                      <Input
                        id="user-name"
                        value={userForm.full_name}
                        onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                        placeholder="Nome completo do usuário"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-role">Cargo</Label>
                      <Select 
                        value={userForm.role} 
                        onValueChange={(value: 'admin' | 'manager' | 'user') => 
                          setUserForm({...userForm, role: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-department">Departamento</Label>
                      <Select 
                        value={userForm.department_id} 
                        onValueChange={(value) => setUserForm({...userForm, department_id: value, unit_id: ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {userForm.department_id && (
                      <div className="space-y-2">
                        <Label htmlFor="user-unit">Unidade</Label>
                        <Select 
                          value={userForm.unit_id} 
                          onValueChange={(value) => setUserForm({...userForm, unit_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma unidade" />
                          </SelectTrigger>
                          <SelectContent>
                            {units
                              .filter(unit => unit.department_id === userForm.department_id)
                              .map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateUser}>
                        Criar Usuário
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        {profile.full_name || profile.user_id}
                      </TableCell>
                      <TableCell>{profile.role || 'Usuário'}</TableCell>
                      <TableCell>{getDepartmentName(profile.department_id)}</TableCell>
                      <TableCell>{getUnitName(profile.unit_id)}</TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen && selectedProfile?.id === profile.id} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProfile(profile)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Usuário</DialogTitle>
                              <DialogDescription>
                                Atribua o usuário a um departamento e unidade
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.target as HTMLFormElement);
                              handleUpdateProfile({
                                department_id: formData.get('department_id') as string,
                                unit_id: formData.get('unit_id') as string
                              });
                            }}>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="department_id">Departamento</Label>
                                  <Select name="department_id" defaultValue={selectedProfile?.department_id || 'unassigned'}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione um departamento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Não atribuir</SelectItem>
                                      {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                          {dept.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="unit_id">Unidade</Label>
                                  <Select name="unit_id" defaultValue={selectedProfile?.unit_id || 'unassigned'}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma unidade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Não atribuir</SelectItem>
                                      {units.map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id}>
                                          {unit.name} ({unit.departments?.name})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                  </Button>
                                  <Button type="submit">
                                    Salvar
                                  </Button>
                                </div>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Empresas</h3>
            <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Empresa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Empresa</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova empresa ao sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nome</Label>
                    <Input
                      id="company-name"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-description">Descrição</Label>
                    <Textarea
                      id="company-description"
                      value={companyForm.description}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição da empresa"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCompany}>
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  {company.description && (
                    <CardDescription>{company.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Departamentos:</strong> {departments.filter(d => d.company_id === company.id).length}
                    </p>
                    <p className="text-sm">
                      <strong>Usuários:</strong> {profiles.filter(p => p.company_id === company.id).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Departamentos</h3>
            <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Departamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Departamento</DialogTitle>
                  <DialogDescription>
                    Adicione um novo departamento ao sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dept-company">Empresa</Label>
                    <Select 
                      value={departmentForm.company_id} 
                      onValueChange={(value) => setDepartmentForm(prev => ({ ...prev, company_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept-name">Nome</Label>
                    <Input
                      id="dept-name"
                      value={departmentForm.name}
                      onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do departamento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept-description">Descrição</Label>
                    <Textarea
                      id="dept-description"
                      value={departmentForm.description}
                      onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição do departamento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept-budget">Orçamento</Label>
                    <Input
                      id="dept-budget"
                      type="number"
                      step="0.01"
                      value={departmentForm.budget}
                      onChange={(e) => setDepartmentForm(prev => ({ ...prev, budget: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDeptDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateDepartment}>
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                  {dept.description && (
                    <CardDescription>{dept.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dept.budget && (
                      <p className="text-sm">
                        <strong>Orçamento:</strong> R$ {dept.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-sm">
                      <strong>Unidades:</strong> {units.filter(u => u.department_id === dept.id).length}
                    </p>
                    <p className="text-sm">
                      <strong>Usuários:</strong> {profiles.filter(p => p.department_id === dept.id).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="units" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Unidades</h3>
            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Unidade</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova unidade ao sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit-name">Nome</Label>
                    <Input
                      id="unit-name"
                      value={unitForm.name}
                      onChange={(e) => setUnitForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome da unidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit-description">Descrição</Label>
                    <Textarea
                      id="unit-description"
                      value={unitForm.description}
                      onChange={(e) => setUnitForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição da unidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit-department">Departamento</Label>
                    <Select value={unitForm.department_id} onValueChange={(value) => setUnitForm(prev => ({ ...prev, department_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateUnit}>
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map((unit) => (
              <Card key={unit.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{unit.name}</CardTitle>
                  {unit.description && (
                    <CardDescription>{unit.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Departamento:</strong> {unit.departments?.name}
                    </p>
                    <p className="text-sm">
                      <strong>Usuários:</strong> {profiles.filter(p => p.unit_id === unit.id).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;