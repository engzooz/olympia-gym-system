IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'olympia_gym')
BEGIN
    CREATE DATABASE olympia_gym;
END
GO

USE olympia_gym;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Packages')
BEGIN
    CREATE TABLE Packages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        duration_days INT NOT NULL
    );

    INSERT INTO Packages (name, price, duration_days) VALUES 
    ('1 Month Basic', 500.00, 30),
    ('3 Months Silver', 1300.00, 90),
    ('1 Year Gold', 4000.00, 365);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Trainees')
BEGIN
    CREATE TABLE Trainees (
        id INT IDENTITY(1,1) PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        age INT NOT NULL,
        weight DECIMAL(5, 2) NOT NULL,
        height DECIMAL(5, 2) NOT NULL,
        package_id INT FOREIGN KEY REFERENCES Packages(id),
        qr_code_hash VARCHAR(255) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Attendance')
BEGIN
    CREATE TABLE Attendance (
        id INT IDENTITY(1,1) PRIMARY KEY,
        trainee_id INT FOREIGN KEY REFERENCES Trainees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        time_in TIME NULL,
        status VARCHAR(10) DEFAULT 'Present'
    );
END
GO