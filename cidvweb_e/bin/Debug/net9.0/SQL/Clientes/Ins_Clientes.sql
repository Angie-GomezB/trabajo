-- =============================================
-- Proceso: Ins_Clientes
-- Descripción:
-- =============================================

--START_PARAM
declare
    @Id_Fiscal     varchar(20)  = '1234',
    @Nm_Cliente1   varchar(150) = 'Maria',
    @Nm_Cliente2   varchar(150) = 'Angelica', --null
    @Ap_Cliente1   varchar(150) = 'Cespedes',
    @Ap_Cliente2   varchar(150) = null,
    @email         varchar(200) = 'angelicac@correo.com',
    @telefono      varchar(50)  = '3210000100',
    @direccion     varchar(300) = 'Calle 123 casa 4',
    @ciudad        varchar(100) = 'Cali',
    @usuario       varchar(100) = 'angie'
--END_PARAM

set transaction isolation level read uncommitted

if not exists (
    select 1
    from Fact_Clientes
    where Id_Fiscal = @Id_Fiscal
)
begin
    insert into Fact_Clientes
    (
        Id_Fiscal,
        Nm_Cliente1,
        Nm_Cliente2,
        Ap_Cliente1,
        Ap_Cliente2,
        email,
        telefono,
        direccion,
        ciudad,
        Created_By
    )
    values
    (
        @Id_Fiscal,
        lower(ltrim(rtrim(@Nm_Cliente1))),
        lower(ltrim(rtrim(@Nm_Cliente2))),
        lower(ltrim(rtrim(@Ap_Cliente1))),
        lower(ltrim(rtrim(@Ap_Cliente2))),
        @email,
        @telefono,
        @direccion,
        @ciudad,
        @usuario
    )
end