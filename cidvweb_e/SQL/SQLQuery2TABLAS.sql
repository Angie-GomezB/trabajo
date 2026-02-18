/* --------------------------------------------------------
   CREACION DE TABLA FACT_CLIENTES
   --------------------------------------------------------*/

create table Fact_Clientes (
    Id_Cliente int identity(1,1) primary key,
    Id_Fiscal varchar(20) not null,           -- NIT / CEDULA
    Nm_Cliente1 varchar(150) not null,
    Nm_Cliente2 varchar(150),
    Ap_Cliente1 varchar(150) not null,
    Ap_Cliente2 varchar(150),

    email varchar(200),
    telefono varchar(50),
    direccion varchar(300),
    ciudad varchar(100),

    activo bit not null default 1,
    Fecha_Creacion datetime default getdate(),
    Created_By varchar(100),
    Updated_By varchar(100),
    Fecha_Actualizacion datetime
);
go


/* --------------------------------------------------------
   CREACION DE TABLA FACT_FACTURAS
   -------------------------------------------------------- */

create table Fact_Facturas (
    Id_Factura int identity(1,1) primary key,

    Sucursal_Emisora varchar(50) not null,     -- FILIAL EMITENTE (FEDEX)
    Numero_Factura varchar(50) not null,       -- NUMERO DE LA FACTURA
    Secuencia_Factura int not null,            -- SECUENCIA

    Id_Cliente int not null,                   -- ID INTERNO CLIENTE
    Fecha_Emision date not null,               -- FECHA EMISION

    Valor_Factura decimal(18,2) not null,      -- VALOR TOTAL
    Valor_Impuesto decimal(18,2),              -- IMPUESTO
    Base_Calculo decimal(18,2),                -- BASE
    Porcentaje_Impuesto decimal(5,2),          -- %

    Tipo_Factura varchar(50),                  -- TIPO FACTURA
    modalidad varchar(50),                     -- MODALIDAD
    Tipo_Servicio varchar(100),                -- SERVICIO
    Estado_Factura varchar(50),                -- ESTADO

    Codigo_Ean_Fedex varchar(50),               -- CODIGO FEDEX
    observaciones varchar(500),                -- MENSAJES

    Fecha_Creacion datetime default getdate(),
    Created_By varchar(100)
);
go



/* --------------------------------------------------------
   CREACION DE CLAVE FORANEA
   -------------------------------------------------------- */

alter table Fact_Facturas 
add constraint fk_Facturas_Clientes 
foreign key (Id_Cliente) references Fact_Clientes(Id_Cliente);
go

exec sp_help 'dbo.Fact_Clientes';
exec sp_help 'dbo.Fact_Facturas';


select * from Fact_Clientes
select * from Fact_Facturas

alter table dbo.Fact_Facturas
add Fecha_Actualizacion datetime;
go

alter table dbo.Fact_Facturas
add Updated_By varchar(100);
go


/* --------------------------------------------------------
   CREACION DE LOG_FACTURAS_HISTORIAL
   -------------------------------------------------------- */

create table Log_Facturas_Historial (
    Id_Historial int identity(1,1) primary key,

    Id_Factura int not null,

    Valor_Factura decimal(18,2),
    Valor_Impuesto decimal(18,2),
    Base_Calculo decimal(18,2),
    Porcentaje_Impuesto decimal(5,2),

    Estado_Factura varchar(50),
    observaciones varchar(500),

    Motivo_Cambio varchar(300),
    Fecha_Cambio datetime default getdate(),
    Usuario_Cambio varchar(100)
);
go

/* --------------------------------------------------------
   CREACION DE CLAVE FORANEA
   -------------------------------------------------------- */

alter table dbo.Log_Facturas_Historial
add constraint fk_Log_Facturas_Facturas
foreign key (Id_Factura)
references dbo.Fact_Facturas(Id_Factura);
go


select * from Fact_Clientes;
delete from Fact_Facturas;
dbcc checkident ('Fact_Facturas', reseed, 0);
