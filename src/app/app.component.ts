import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
declare var Chart: any;

export interface Servicio {
  id: string;
  chofer: string;
  cliente: string;
  descripcion: string;
  fecha: string;
  tarifa: number;
  mes: string;
  registradoPor: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, AfterViewInit {
  // --- ESTADOS DE LA APP ---
  isAuthenticated: boolean = false;
  codigoIngresado: string = '';
  currentView: string = 'dashboard';
  usuarioActivo: { nombre: string; rol: string } | null = null;

  // --- VARIABLES DE EDICIÓN (NUEVO) ---
  servicioSeleccionado: Servicio | null = null;
  modoEdicion: boolean = false;

  // --- DATOS DE SERVICIOS ---
  servicios: Servicio[] = [];
  chofer: string = '';
  cliente: string = '';
  descripcion: string = '';
  fecha: string = '';
  tarifa: number = 0;
  mes: string = '';
  meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // --- VARIABLES DASHBOARD ---
  choferSeleccionado: string = '';
  chartInstance: any = null;
  @ViewChild('myChart') myChartRef!: ElementRef;

  ngOnInit() {
    const authUser = localStorage.getItem('taxi_teacher_user');
    if (authUser) {
      this.usuarioActivo = JSON.parse(authUser);
      this.isAuthenticated = true;
      if (this.usuarioActivo?.rol === 'asistente' && this.currentView === 'dashboard') {
        this.currentView = 'registrar';
      }
    }
    this.cargarDatos();
  }

  ngAfterViewInit() {
    if (
      this.isAuthenticated &&
      this.currentView === 'dashboard' &&
      this.usuarioActivo?.rol === 'admin'
    ) {
      setTimeout(() => this.actualizarGrafico(), 100);
    }
  }

  // --- LÓGICA DE ROLES ---
  verificarCodigo() {
    if (this.codigoIngresado.trim() === 'TEACHER2024') {
      this.usuarioActivo = { nombre: 'Admin Teacher', rol: 'admin' };
      this.isAuthenticated = true;
      this.currentView = 'dashboard';
      localStorage.setItem('taxi_teacher_user', JSON.stringify(this.usuarioActivo));
      setTimeout(() => this.actualizarGrafico(), 100);
    } else if (this.codigoIngresado.trim() === 'ASISTENTETEACHER') {
      this.usuarioActivo = { nombre: 'Asistente', rol: 'asistente' };
      this.isAuthenticated = true;
      this.currentView = 'registrar';
      localStorage.setItem('taxi_teacher_user', JSON.stringify(this.usuarioActivo));
    } else {
      alert('Código incorrecto. Inténtalo de nuevo.');
    }
    this.codigoIngresado = '';
  }

  cerrarSesion() {
    this.isAuthenticated = false;
    this.usuarioActivo = null;
    this.codigoIngresado = '';
    localStorage.removeItem('taxi_teacher_user');
    this.currentView = 'dashboard';
    if (this.chartInstance) this.chartInstance.destroy();
  }

  cambiarVista(vista: string) {
    this.currentView = vista;
    if (vista === 'dashboard' && this.usuarioActivo?.rol === 'admin') {
      setTimeout(() => this.actualizarGrafico(), 100);
    }
  }

  // --- LÓGICA DE SERVICIOS (Crear, Editar, Eliminar) ---
  guardarServicio() {
    if (!this.chofer || !this.cliente || !this.fecha || !this.tarifa || !this.mes) return;
    const nuevoServicio: Servicio = {
      id: Date.now().toString(),
      chofer: this.chofer.trim(),
      cliente: this.cliente.trim(),
      descripcion: this.descripcion.trim(),
      fecha: this.fecha,
      tarifa: this.tarifa,
      mes: this.mes,
      registradoPor: this.usuarioActivo?.rol || 'admin',
    };
    this.servicios.push(nuevoServicio);
    this.guardarDatosLocales();
    this.chofer = '';
    this.cliente = '';
    this.descripcion = '';
    this.fecha = '';
    this.tarifa = 0;
    this.mes = '';
    alert('Servicio registrado exitosamente');
    if (this.usuarioActivo?.rol === 'admin' && this.currentView === 'dashboard')
      this.actualizarGrafico();
  }

  eliminarServicio(id: string) {
    if (confirm('¿Eliminar registro?')) {
      this.servicios = this.servicios.filter((s) => s.id !== id);
      this.guardarDatosLocales();
      if (this.usuarioActivo?.rol === 'admin' && this.currentView === 'dashboard')
        this.actualizarGrafico();
    }
  }

  // --- LÓGICA DE MODAL (DETALLES Y EDICIÓN) ---
  abrirDetalles(servicio: Servicio) {
    if (this.usuarioActivo?.rol !== 'admin') return; // Seguridad: Solo admin
    this.servicioSeleccionado = { ...servicio }; // Hacemos una copia para no alterar la tabla hasta guardar
    this.modoEdicion = false;
  }

  cerrarModal() {
    this.servicioSeleccionado = null;
    this.modoEdicion = false;
  }

  guardarEdicion() {
    if (!this.servicioSeleccionado) return;
    // Buscamos el índice del servicio original
    const index = this.servicios.findIndex((s) => s.id === this.servicioSeleccionado!.id);
    if (index !== -1) {
      // Reemplazamos el viejo con la copia editada
      this.servicios[index] = { ...this.servicioSeleccionado };
      this.guardarDatosLocales();
      alert('Servicio actualizado correctamente');

      // Actualizamos gráficos si estuvieramos en esa vista (por si acaso)
      if (this.usuarioActivo?.rol === 'admin') this.actualizarGrafico();
    }
    this.cerrarModal();
  }

  // --- PERSISTENCIA Y FILTROS ---
  guardarDatosLocales() {
    localStorage.setItem('taxi_teacher_services', JSON.stringify(this.servicios));
  }
  cargarDatos() {
    const data = localStorage.getItem('taxi_teacher_services');
    if (data) this.servicios = JSON.parse(data);
  }

  get serviciosVisibles(): Servicio[] {
    return this.usuarioActivo?.rol === 'admin'
      ? this.servicios
      : this.servicios.filter((s) => s.registradoPor === 'asistente');
  }

  // --- MÉTRICAS Y CÁLCULOS ---
  get totalGeneral(): number {
    return this.servicios.reduce((acc, curr) => acc + curr.tarifa, 0);
  }
  get totalMesActual(): number {
    if (!this.mes) return 0;
    return this.servicios
      .filter((s) => s.mes === this.mes)
      .reduce((acc, curr) => acc + curr.tarifa, 0);
  }
  get totalMesAnterior(): number {
    if (!this.mes) return 0;
    const indexActual = this.meses.indexOf(this.mes);
    const mesAnterior = indexActual === 0 ? 'Diciembre' : this.meses[indexActual - 1];
    return this.servicios
      .filter((s) => s.mes === mesAnterior)
      .reduce((acc, curr) => acc + curr.tarifa, 0);
  }
  get diferenciaMes(): number {
    return this.totalMesActual - this.totalMesAnterior;
  }
  get porcentajeAumento(): number {
    if (!this.mes) return 0;
    const anterior = this.totalMesAnterior;
    const actual = this.totalMesActual;
    if (anterior === 0) return actual > 0 ? 100 : 0;
    return ((actual - anterior) / anterior) * 100;
  }
  get listaChoferesUnicos(): string[] {
    return [...new Set(this.servicios.map((s) => s.chofer))];
  }
  get gananciaChoferSeleccionado(): number {
    if (!this.choferSeleccionado || !this.mes) return 0;
    return this.servicios
      .filter((s) => s.chofer === this.choferSeleccionado && s.mes === this.mes)
      .reduce((acc, curr) => acc + curr.tarifa, 0);
  }

  onMesChange() {
    if (this.usuarioActivo?.rol === 'admin') this.actualizarGrafico();
  }

  // --- GRÁFICO ---
  actualizarGrafico() {
    if (!this.myChartRef) return;
    const ctx = this.myChartRef.nativeElement.getContext('2d');
    let labels: string[] = [];
    let data: number[] = [];
    let tituloGrafico = '';
    if (this.mes) {
      tituloGrafico = `Ganancias por Chofer en el mes de ${this.mes}`;
      const serviciosDelMes = this.servicios.filter((s) => s.mes === this.mes);
      const gananciasPorChofer: { [key: string]: number } = {};
      serviciosDelMes.forEach((s) => {
        if (!gananciasPorChofer[s.chofer]) gananciasPorChofer[s.chofer] = 0;
        gananciasPorChofer[s.chofer] += s.tarifa;
      });
      labels = Object.keys(gananciasPorChofer);
      data = Object.values(gananciasPorChofer);
    } else {
      tituloGrafico = 'Seleccione un mes en "Saldo del mes" para ver los datos';
    }
    if (this.chartInstance) this.chartInstance.destroy();
    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Ingresos (S/)', data: data, backgroundColor: '#dfa338', borderRadius: 5 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, title: { display: true, text: tituloGrafico } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}
