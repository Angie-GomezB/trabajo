-- =============================================
-- Proceso: Landing/Ins_Aprobacion_Otros
-- Descripción:
-- =============================================
--START_PARAM
declare 
	@Token varchar(100),
	@Observaciones varchar(max)
--END_PARAM
set transaction isolation level read uncommitted


declare @Id_Prefactura_CIDV int

select top 1 @Id_Prefactura_CIDV = Id_Prefactura_CIDV
from Fact_Prefacturas_CIDV
where Token = @Token

update a set
	Observaciones = @Observaciones,
	Fecha_Actualizacion = getdate()
from Fact_Prefacturas_CIDV a
where a.Id_Prefactura_CIDV = @Id_Prefactura_CIDV

exec RPA_Ins_Paso
	@Id_Prefactura_CIDV = @Id_Prefactura_CIDV,
	@Id_Estado_CIDV = 2031, /*Otros landing*/
	@Observaciones = 'Otros landing',
	@Created_By = 'landing'
/*
insert into Dim_Estado_CIDV(Id_Estado_CIDV, Estado_CIDV, Id_Tipo_CIDV, Color) values 
(2031, 'Otros landing', 2, '#00cc99')
*/
select 'La información se actualizó corretamente'