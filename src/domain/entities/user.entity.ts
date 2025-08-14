import { Entity, PrimaryColumn, CreateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryColumn({ name: "user_id", type: "varchar", length: 255 })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
