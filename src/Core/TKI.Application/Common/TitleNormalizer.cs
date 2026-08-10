namespace TKI.Application.Common;

public static class TitleNormalizer
{
    public static string Normalize(string title)
        => title.Trim().ToUpperInvariant().Replace('İ', 'I');
}
