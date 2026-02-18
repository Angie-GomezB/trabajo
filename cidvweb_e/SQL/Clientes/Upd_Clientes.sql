-- =============================================
-- Proceso: Upd_Clientes
-- Descripción:
-- =============================================

--START_PARAM
declare
    @Id_Cliente int = 11,
    @Nm_Cliente1 varchar(150) = 'Pepe',
    @Nm_Cliente2 varchar(150) = null,
    @Ap_Cliente1 varchar(150) = 'Suarez',
    @Ap_Cliente2 varchar(150) = null,
    @email      varchar(200) = 'pepe@correo.com',
    @telefono   varchar(50)  = '4891651',
    @direccion  varchar(300) = 'Cra 19',
    @ciudad     varchar(100) = 'Armenia',
    @activo     bit = 1,
    @usuario    varchar(100) = 'angie'
--END_PARAM

set transaction isolation level read uncommitted

update Fact_Clientes
set
    Nm_Cliente1 = @Nm_Cliente1,
    Nm_Cliente2 = @Nm_Cliente2,
    Ap_Cliente1 = @Ap_Cliente1,
    Ap_Cliente2 = @Ap_Cliente2,
    email = @email,
    telefono = @telefono,
    direccion = @direccion,
    ciudad = @ciudad,
    activo = @activo,
    Updated_By = @usuario,
    Fecha_Actualizacion = getdate()
where Id_Cliente = @Id_Cliente;

select * from Fact_Clientes;


UPDATE Fact_Clientes
SET 
    Nm_Cliente2 = CASE WHEN Nm_Cliente2 = '' THEN NULL ELSE Nm_Cliente2 END,
    Ap_Cliente2 = CASE WHEN Ap_Cliente2 = '' THEN NULL ELSE Ap_Cliente2 END,
    direccion = CASE WHEN direccion = '' THEN NULL ELSE direccion END,
    ciudad = CASE WHEN ciudad = '' THEN NULL ELSE ciudad END
WHERE Nm_Cliente2 = '' OR Ap_Cliente2 = '' OR direccion = '' OR ciudad = '';