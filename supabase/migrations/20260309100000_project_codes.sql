-- Short shareable project codes (e.g. "SPILL-A7X3")
alter table projects add column code text unique;

-- Generate codes for existing projects
update projects set code = 'SPILL-' || upper(substr(md5(id::text), 1, 4))
where code is null;

alter table projects alter column code set not null;

create index idx_projects_code on projects(code);
