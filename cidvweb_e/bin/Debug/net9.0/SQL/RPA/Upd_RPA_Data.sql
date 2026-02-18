-- =============================================
-- Proceso: RPA/Upd_RPA_Data
-- Descripción:
-- =============================================
--START_PARAM
declare
	@Id int,
	@Tipo varchar(50),
	@Resultado varchar(1000),
	@Datos varchar(max)
--END_PARAM
set transaction isolation level read uncommitted
declare @Llave varchar(50), @Sub_Tipo varchar(50), @LlaveR varchar(50)

declare @Is_Active bit, @Fecha datetime, @Id_Base int

if @Tipo = 'UpdResultadoCola' begin
	
	update Cola_Tareas_RPA set
		Resultado = @Resultado,
		Updated_On = getdate()
	where Id_Cola_Tareas_RPA = @Id

	select 'OK'
	return
end

select top 1 @Is_Active = Is_Active
from Cola_Tareas_RPA
where Id_Cola_Tareas_RPA = @Id

if @Is_Active = 1 begin
	update Cola_Tareas_RPA set
		Is_Active = 0,
		Resultado = @Resultado,
		Updated_On = getdate(),
		@Llave = Llave,
		@Sub_Tipo = Sub_Tipo
	where Id_Cola_Tareas_RPA = @Id
end

select 'OK'

	