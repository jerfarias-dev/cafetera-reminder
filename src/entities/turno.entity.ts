import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Persona } from './persona.entity';
import { Dia } from './dia.entity';

@Entity('turnos')
export class Turno {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dia_id' })
  dia_id: number;

  @Column({ name: 'persona_id' })
  persona_id: number;

  @Column({ type: 'boolean', default: false })
  enviado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fecha_envio?: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updated_at: Date;

  @ManyToOne(() => Dia, dia => dia.turnos)
  @JoinColumn({ name: 'dia_id' })
  dia: Dia;

  @ManyToOne(() => Persona, persona => persona.turnos)
  @JoinColumn({ name: 'persona_id' })
  persona: Persona;
}