-- =============================================
-- Proceso: Landing/Ins_Aprobacion_Express
-- Descripción:
-- =============================================
--START_PARAM
declare 
	@Token varchar(100),
	@Orden_Compra varchar(50),
	@Fecha_Orden_Compra varchar(20),
	@Archivo varchar(200),
	@Ruta varchar(200),
	@Observaciones varchar(max)
--END_PARAM
set transaction isolation level read uncommitted


declare @Id_Prefactura_CIDV int, @Fecha_Aprobado date = convert(date, @Fecha_Orden_Compra, 120) 

select top 1 @Id_Prefactura_CIDV = Id_Prefactura_CIDV
from Fact_Prefacturas_CIDV
where Token = @Token

update a set
	Fecha_Aprobado = @Fecha_Aprobado,
	Orden_Compra = @Orden_Compra,
	Ruta_Archivo = @Ruta,
	Observaciones = @Observaciones,
	Fecha_Actualizacion = getdate()
from Fact_Prefacturas_CIDV a
where a.Id_Prefactura_CIDV = @Id_Prefactura_CIDV

exec RPA_Ins_Paso
	@Id_Prefactura_CIDV = @Id_Prefactura_CIDV,
	@Id_Estado_CIDV = 2029, /*Aprobación Express landing*/
	@Observaciones = 'Aprobación Express landing',
	@Created_By = 'landing'
/*
insert into Dim_Estado_CIDV(Id_Estado_CIDV, Estado_CIDV, Id_Tipo_CIDV, Color) values 
(2029, 'Aprobación Express landing', 2, '#00cc99')
*/
exec Ws_RPA_Ins_Respuesta_Correo_CIDV
	@Fecha_Aprobado = @Fecha_Aprobado,
	@Orden_Compra = @Orden_Compra,
	@Aprobacion_Manual = 1,
	@Id_Prefactura = @Id_Prefactura_CIDV


select 'La información se actualizó corretamente'