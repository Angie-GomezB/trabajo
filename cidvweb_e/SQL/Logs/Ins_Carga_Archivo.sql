-- =============================================
-- Proceso: Logs/Ins_Carga_Archivo
-- Descripción:
-- =============================================
--START_PARAM
declare 
	@Proceso varchar(100),
	@Archivo varchar(200),
	@Resultado varchar(200)
--END_PARAM
set transaction isolation level read uncommitted

insert into Log_Carga_Archivos(Proceso, Archivo, Resultado)
select @Proceso, @Archivo, @Resultado

select 'OK'