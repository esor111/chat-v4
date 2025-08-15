import { Entity, Column } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ name: "user_id", type: "varchar", length: 255, unique: true })
  userId: string;
}
