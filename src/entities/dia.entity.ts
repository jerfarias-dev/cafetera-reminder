import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Turno } from './turno.entity';

export enum TipoDia {
  LABORAL = 'laboral',
  ASUETO = 'asueto',
  FIN_SEMANA = 'fin_semana'
}

@Entity('dias')
export class Dia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  fecha: string;

  @Column({ 
    type: 'enum', 
    enum: TipoDia,
    name: 'tipo_dia'
  })
  tipo_dia: TipoDia;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion?: string;

  // Campo calculado solo en código, no en base de datos

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updated_at: Date;

  @OneToMany(() => Turno, turno => turno.dia)
  turnos: Turno[];

  // Getter para calcular es_habil
  get esHabil(): boolean {
    return this.tipo_dia === TipoDia.LABORAL;
  }
}