import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DestinationEntity } from './destination.entity';
import { ActivityEntity } from 'src/schemas/activity.entity';

@Entity({ name: 'activity_destinations' })
export class ActivityDestinationEntity {
  @PrimaryColumn('uuid', { name: 'activity_id' })
  activityId: string;

  @PrimaryColumn('uuid', { name: 'destination_id' })
  destinationId: string;

  @ManyToOne(
    () => ActivityEntity,
    (activity) => activity.activityDestinations,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'activity_id' })
  activity: ActivityEntity;

  @ManyToOne(
    () => DestinationEntity,
    (destination) => destination.activityDestinations,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'destination_id' })
  destination: DestinationEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
