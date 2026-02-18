-- =============================================
-- Proceso: RPA/Get_RPA_Data
-- Descripción:
-- =============================================
--START_PARAM
declare
	@Tipo varchar(50),
	@Modulo int,
	@Instancia int
--END_PARAM
set transaction isolation level read uncommitted
declare @Datos varchar(1000), @Id_Cola_Tareas_RPA int, @Sub_Tipo varchar(50),
	@Requested_Times int

declare @Id int = 0, @Mod int = 1, @Cus_Id int
if @Modulo > 1 begin

	select top 1 @Datos = Datos, @Id_Cola_Tareas_RPA = Id_Cola_Tareas_RPA, @Sub_Tipo = Sub_Tipo, @Requested_Times = Requested_Times
	from Cola_Tareas_RPA
	where Is_Active = 1 and Tipo = @Tipo and Fecha_Programada <= getdate() 
		and Id_Cola_Tareas_RPA % @Modulo = @Instancia --and Requested_Times < 4
	order by Prioridad desc, Id_Cola_Tareas_RPA asc

end else begin
	select top 1 @Datos = Datos, @Id_Cola_Tareas_RPA = Id_Cola_Tareas_RPA, @Sub_Tipo = Sub_Tipo, @Requested_Times = Requested_Times
	from Cola_Tareas_RPA
	where Is_Active = 1 and Tipo = @Tipo and Fecha_Programada <= getdate()
		--and Requested_Times < 4
	order by Prioridad desc, Id_Cola_Tareas_RPA asc
end

if @Requested_Times > 3 begin
	update Cola_Tareas_RPA set
		Is_Active = 0, 
		Resultado = 'Error - Mas de tres intentos'
	where Id_Cola_Tareas_RPA = @Id_Cola_Tareas_RPA
	select 'NA'
end
if @Id_Cola_Tareas_RPA is not null begin

	update Cola_Tareas_RPA set
		Requested_On = getdate(),
		Requested_Times = Requested_Times + 1
	where Id_Cola_Tareas_RPA = @Id_Cola_Tareas_RPA

	select '{"id":'+convert(varchar,@Id_Cola_Tareas_RPA)+',"subType":"'+isnull(@Sub_Tipo,'')+'",'+@Datos+'}'
end else 
	select 'NA'
