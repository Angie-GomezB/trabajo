-- =========================================================
-- Proceso: Ins_Facturas
-- Descripción: Inserta una nueva factura
-- =========================================================

--START_PARAM
declare
    @Sucursal_Emisora    varchar(50)  = 'FEDEX-BOG',
    @Numero_Factura      varchar(50)  = 'FAC-001',
    @Secuencia_Factura   int          = 1,
    @Id_Cliente          int          = 1,
    @Fecha_Emision       date         = '2026-02-10',
    @Valor_Factura       decimal(18,2)= 100000,
    @Valor_Impuesto      decimal(18,2)= 19000,
    @Base_Calculo        decimal(18,2)= 100000,
    @Porcentaje_Impuesto decimal(5,2) = 19,
    @Tipo_Factura        varchar(50)  = 'SERVICIO',
    @modalidad           varchar(50)  = 'CONTADO',
    @Tipo_Servicio       varchar(100) = 'ENVIO',
    @Estado_Factura      varchar(50)  = 'GENERADA',
    @Codigo_ean_Fedex    varchar(50)  = 'EAN123',
    @observaciones       varchar(500) = 'Factura inicial',
    @usuario             varchar(100) = 'angie'
--END_PARAM

set transaction isolation level read uncommitted

insert into Fact_Facturas
(
    Sucursal_Emisora,
    Numero_Factura,
    Secuencia_Factura,
    Id_Cliente,
    Fecha_Emision,
    Valor_Factura,
    Valor_Impuesto,
    Base_Calculo,
    Porcentaje_Impuesto,
    Tipo_Factura,
    modalidad,
    Tipo_Servicio,
    Estado_Factura,
    Codigo_ean_Fedex,
    observaciones,
    Created_By
)
values
(
    @Sucursal_Emisora,
    @Numero_Factura,
    @Secuencia_Factura,
    @Id_Cliente,
    @Fecha_Emision,
    @Valor_Factura,
    @Valor_Impuesto,
    @Base_Calculo,
    @Porcentaje_Impuesto,
    @Tipo_Factura,
    @modalidad,
    @Tipo_Servicio,
    @Estado_Factura,
    @Codigo_ean_Fedex,
    @observaciones,
    @usuario
);

select scope_identity() as Id_Factura;
