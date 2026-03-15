CREATE TABLE IF NOT EXISTS booking_locks (
    booking_lock_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    desk_id BIGINT NOT NULL,
    day DATE NOT NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (booking_lock_id),
    UNIQUE KEY uq_booking_locks_desk_day (desk_id, day),
    KEY idx_booking_locks_expires_at (expires_at),
    CONSTRAINT fk_booking_locks_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_booking_locks_desk FOREIGN KEY (desk_id) REFERENCES desks (desk_id)
) ENGINE=InnoDB;
